package service

import (
	"context"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
)

// KnowledgeConfig 知识库对接路径与默认分类（教案 / 周计划），用于上传时强制纠正。
type KnowledgeConfig struct {
	ListPath   string
	DetailPath string
	UploadPath string
	DeletePath string
	DefaultID  string
	// 教案 / 周计划分类（上传时按标题强制纠正，避免误入教师成果库）
	ActivityCategoryID  string
	ActivityCategoryKey string
	WeeklyCategoryID    string
	WeeklyCategoryKey   string
}

// UploadDocumentInput 上传文档到平台知识库的入参。
type UploadDocumentInput struct {
	KnowledgeID string `json:"knowledgeId"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	CategoryID  string `json:"categoryId"`
	CategoryKey string `json:"categoryKey"`
	// CategoryName: 平台分类显示名（如「教案知识库管理」），辅助落到正确文件夹
	CategoryName string `json:"categoryName"`
	// ForceKind: activity | weekly | archive；与标题标记一起决定是否清洗手机号、是否允许回退 env 分类
	ForceKind string `json:"forceKind"`
}

// KnowledgeService 对接 AI101 知识库：列表/详情/上传/删除，并把平台响应映射为 TeachingPlan。
// 不落 MySQL 教案正文；分类纠正与手机号清洗在此完成。
type KnowledgeService struct {
	platform *PlatformClient
	cfg      KnowledgeConfig
}

func NewKnowledgeService(platform *PlatformClient, cfg KnowledgeConfig) *KnowledgeService {
	return &KnowledgeService{platform: platform, cfg: cfg}
}

func (s *KnowledgeService) ListPlans(
	ctx context.Context,
	headers ForwardHeaders,
	params model.ListKnowledgePlansParams,
) (model.ListKnowledgePlansResult, error) {
	page, limit := normalizePagination(params.Page, params.Limit)
	knowledgeID := strings.TrimSpace(params.KnowledgeID)
	if knowledgeID == "" {
		knowledgeID = strings.TrimSpace(s.cfg.DefaultID)
	}
	if knowledgeID == "" {
		return model.ListKnowledgePlansResult{}, fmt.Errorf("knowledgeId is required")
	}

	items, total, err := s.listDocuments(ctx, headers, params.Keyword, knowledgeID, params.CategoryID, params.CategoryKey, page, limit)
	if err != nil {
		return model.ListKnowledgePlansResult{}, err
	}
	if total <= 0 {
		total = len(items)
	}

	return model.ListKnowledgePlansResult{
		Items:  items,
		Total:  total,
		Page:   page,
		Limit:  limit,
		Source: "platform",
	}, nil
}

func (s *KnowledgeService) GetPlan(ctx context.Context, headers ForwardHeaders, id string) (model.TeachingPlan, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return model.TeachingPlan{}, fmt.Errorf("plan id is required")
	}

	plan, err := s.getDocument(ctx, headers, id)
	if err != nil {
		return model.TeachingPlan{}, err
	}
	if plan.ID == "" {
		return model.TeachingPlan{}, fmt.Errorf("knowledge plan not found")
	}
	return plan, nil
}

const maxUploadContentRunes = 2 * 1024 * 1024 // ~2MB 文本上限

// UploadDocument 上传文本到平台知识库：校验 → 纠正分类 → 调平台 → 映射为 TeachingPlan。
func (s *KnowledgeService) UploadDocument(
	ctx context.Context,
	headers ForwardHeaders,
	input UploadDocumentInput,
) (model.TeachingPlan, error) {
	title := strings.TrimSpace(input.Title)
	content := strings.TrimSpace(input.Content)
	if title == "" {
		return model.TeachingPlan{}, fmt.Errorf("title is required")
	}
	if content == "" {
		return model.TeachingPlan{}, fmt.Errorf("content is required")
	}
	if len([]rune(content)) > maxUploadContentRunes {
		return model.TeachingPlan{}, fmt.Errorf("content too large, please split under 2MB text")
	}

	knowledgeID := strings.TrimSpace(input.KnowledgeID)
	if knowledgeID == "" {
		knowledgeID = strings.TrimSpace(s.cfg.DefaultID)
	}
	if knowledgeID == "" {
		return model.TeachingPlan{}, fmt.Errorf("knowledgeId is required")
	}

	uploadPath := strings.TrimSpace(s.cfg.UploadPath)
	if uploadPath == "" {
		uploadPath = "/api/knowledge/document/text"
	}

	categoryID, categoryKey, scrubPhones := resolveUploadCategory(
		title,
		input.ForceKind,
		input.CategoryID,
		input.CategoryKey,
		s.cfg,
	)
	archiveTwoStep := strings.TrimSpace(input.ForceKind) == "archive"
	contentOut := content
	if scrubPhones {
		contentOut = scrubElevenDigitPhones(contentOut)
	}

	body := map[string]any{
		"knowledge_id": parseIDValue(knowledgeID),
		"name":         title,
		"title":        title,
		"text":         contentOut,
		"content":      contentOut,
	}
	// 成果库子文件夹：平台 SPA 为先 text 再 edit；一步带 category 易落到根目录
	if !archiveTwoStep {
		if categoryID != "" {
			body["category_id"] = parseIDValue(categoryID)
		}
		if categoryKey != "" {
			body["category_key"] = categoryKey
		}
		if name := strings.TrimSpace(input.CategoryName); name != "" {
			body["category_name"] = name
		}
	}

	var envelope PlatformAPIEnvelope
	if err := s.platform.PostJSON(ctx, uploadPath, body, headers, &envelope); err != nil {
		return model.TeachingPlan{}, err
	}
	if err := envelope.FailError("platform document upload failed"); err != nil {
		return model.TeachingPlan{}, err
	}

	plans, err := mapPlatformPlansStrict(envelope.Result, knowledgeID, PlatformMapUpload)
	if err != nil {
		// 兼容：平台只返回 id（字符串 / 数字 / 薄对象）
		docID := pickDocumentID(envelope.Result)
		if docID == "" {
			return model.TeachingPlan{}, fmt.Errorf("platform upload missing document id: %w", err)
		}
		plans = []model.TeachingPlan{{
			ID:          docID,
			Source:      "platform",
			KnowledgeID: knowledgeID,
		}}
	}
	plan := plans[0]
	if plan.Title == "" {
		plan.Title = title
	}
	if plan.Content == "" {
		plan.Content = content
	}
	if plan.Objectives == "" {
		plan.Objectives = truncate(content, 100)
	}
	if plan.Domain == "" {
		plan.Domain = "综合"
	}
	if plan.GradeLevel == "" {
		plan.GradeLevel = "通用"
	}
	plan.Source = "platform"
	plan.KnowledgeID = knowledgeID
	if strings.TrimSpace(plan.ID) == "" {
		return model.TeachingPlan{}, fmt.Errorf("platform upload missing document id")
	}
	if archiveTwoStep {
		if err := s.assignDocumentCategoryAfterArchiveUpload(ctx, headers, plan.ID, categoryID, categoryKey); err != nil {
			return model.TeachingPlan{}, err
		}
	}
	return plan, nil
}

func (s *KnowledgeService) assignDocumentCategoryAfterArchiveUpload(
	ctx context.Context,
	headers ForwardHeaders,
	documentID string,
	categoryID string,
	categoryKey string,
) error {
	docID := strings.TrimSpace(documentID)
	catID := strings.TrimSpace(categoryID)
	if docID == "" {
		return fmt.Errorf("upload succeeded but missing document id")
	}
	if catID == "" {
		return fmt.Errorf("archive folder category is required")
	}
	body := map[string]any{
		"id":          parseIDValue(docID),
		"category_id": parseIDValue(catID),
	}
	if key := strings.TrimSpace(categoryKey); key != "" {
		body["category_key"] = key
	}
	var envelope PlatformAPIEnvelope
	editPath := "/api/knowledge/document/edit"
	if err := s.platform.PostJSON(ctx, editPath, body, headers, &envelope); err != nil {
		return err
	}
	return envelope.FailError("assign archive folder failed")
}

func (s *KnowledgeService) listDocuments(
	ctx context.Context,
	headers ForwardHeaders,
	keyword string,
	knowledgeID string,
	categoryID string,
	categoryKey string,
	page int,
	limit int,
) ([]model.TeachingPlan, int, error) {
	var envelope PlatformAPIEnvelope

	body := map[string]any{
		"knowledge_id": parseIDValue(knowledgeID),
		"current":      page,
		"pageSize":     limit,
	}
	if keyword != "" {
		body["keyword"] = keyword
		body["q"] = keyword
	}
	if cat := strings.TrimSpace(categoryID); cat != "" {
		body["category_id"] = parseIDValue(cat)
	}
	if key := strings.TrimSpace(categoryKey); key != "" {
		body["category_key"] = key
	}

	listPath := strings.TrimSpace(s.cfg.ListPath)
	if listPath == "" {
		listPath = "/api/knowledge/document/list"
	}

	if err := s.platform.PostJSON(ctx, listPath, body, headers, &envelope); err != nil {
		return nil, 0, err
	}
	if err := envelope.FailError("platform document list failed"); err != nil {
		return nil, 0, err
	}

	items, err := mapPlatformPlans(envelope.Result, knowledgeID)
	if err != nil {
		return nil, 0, err
	}
	return items, envelope.Total, nil
}

func (s *KnowledgeService) getDocument(ctx context.Context, headers ForwardHeaders, id string) (model.TeachingPlan, error) {
	var envelope PlatformAPIEnvelope

	detailPath := strings.TrimSpace(s.cfg.DetailPath)
	if detailPath == "" {
		detailPath = "/api/knowledge/document/detail"
	}

	query := url.Values{"document_id": {id}}
	if err := s.platform.GetJSON(ctx, detailPath, query, headers, &envelope); err != nil {
		return model.TeachingPlan{}, err
	}
	if err := envelope.FailError("platform document detail failed"); err != nil {
		return model.TeachingPlan{}, err
	}

	plans, err := mapPlatformPlansStrict(envelope.Result, "", PlatformMapDetail)
	if err != nil {
		return model.TeachingPlan{}, err
	}
	return plans[0], nil
}

func (s *KnowledgeService) DeleteDocument(
	ctx context.Context,
	headers ForwardHeaders,
	id string,
) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("document id is required")
	}

	deletePath := strings.TrimSpace(s.cfg.DeletePath)
	if deletePath == "" {
		deletePath = "/api/knowledge/document/delete"
	}

	var envelope PlatformAPIEnvelope
	body := map[string]any{"id": parseIDValue(id)}
	if err := s.platform.DeleteJSON(ctx, deletePath, body, headers, &envelope); err != nil {
		return err
	}
	return envelope.FailError("platform document delete failed")
}

func parseIDValue(id string) any {
	if n, err := strconv.Atoi(id); err == nil {
		return n
	}
	return id
}

// resolveUploadCategory 优先信任前端 live 解析的分类；仅在客户端未传 id 时回退 env。
// 切勿把 env 旧 key 拼到客户端已提供的 id 上（无效配对会触发平台智能分类进教师成果库）。
// 若客户端误传手机号文件夹 id/key，强制改回教案/周计划业务库。
func resolveUploadCategory(
	title string,
	forceKind string,
	clientID string,
	clientKey string,
	cfg KnowledgeConfig,
) (categoryID string, categoryKey string, scrubPhones bool) {
	categoryID = strings.TrimSpace(clientID)
	categoryKey = strings.TrimSpace(clientKey)
	kind := strings.TrimSpace(forceKind)
	if kind == "" {
		if strings.Contains(title, "_活动方案_") {
			kind = "activity"
		} else if strings.Contains(title, "_周计划_") {
			kind = "weekly"
		}
	}

	isPhoneLike := func(v string) bool {
		if len(v) != 11 || v[0] != '1' {
			return false
		}
		for i := 1; i < 11; i++ {
			if v[i] < '0' || v[i] > '9' {
				return false
			}
		}
		return true
	}

	switch kind {
	case "activity":
		scrubPhones = true
		wantID := strings.TrimSpace(cfg.ActivityCategoryID)
		wantKey := strings.TrimSpace(cfg.ActivityCategoryKey)
		// 误传手机号文件夹时强制改回教案库
		if isPhoneLike(categoryID) || isPhoneLike(categoryKey) {
			categoryID = wantID
			categoryKey = wantKey
			break
		}
		if categoryID == "" {
			categoryID = wantID
			if categoryKey == "" {
				categoryKey = wantKey
			}
		}
		// 客户端已提供 live id 时：不把 env 旧 key 拼上去（无效配对会触发智能分类）
	case "weekly":
		scrubPhones = true
		wantID := strings.TrimSpace(cfg.WeeklyCategoryID)
		wantKey := strings.TrimSpace(cfg.WeeklyCategoryKey)
		if isPhoneLike(categoryID) || isPhoneLike(categoryKey) {
			categoryID = wantID
			categoryKey = wantKey
			break
		}
		if categoryID == "" {
			categoryID = wantID
			if categoryKey == "" {
				categoryKey = wantKey
			}
		}
	}
	return categoryID, categoryKey, scrubPhones
}

// scrubElevenDigitPhones 移除正文中的 11 位手机号（不要掩码留尾号，尾号仍会命中手机号文件夹）。
func scrubElevenDigitPhones(text string) string {
	var b strings.Builder
	b.Grow(len(text))
	runes := []rune(text)
	for i := 0; i < len(runes); {
		if runes[i] == '1' && i+11 <= len(runes) {
			ok := true
			for j := 1; j < 11; j++ {
				if runes[i+j] < '0' || runes[i+j] > '9' {
					ok = false
					break
				}
			}
			if ok {
				i += 11
				continue
			}
		}
		b.WriteRune(runes[i])
		i++
	}
	out := b.String()
	out = regexpReplaceTeacherPhoneHints(out)
	return out
}

func regexpReplaceTeacherPhoneHints(text string) string {
	// 轻量替换，避免引入 regexp 包循环依赖风险：手写扫描「教师尾号：xxxx」「手机号：...」
	replacements := []struct {
		prefix string
	}{
		{"教师尾号："},
		{"教师尾号:"},
		{"手机号："},
		{"手机号:"},
	}
	out := text
	for _, r := range replacements {
		for {
			idx := strings.Index(out, r.prefix)
			if idx < 0 {
				break
			}
			end := idx + len(r.prefix)
			for end < len(out) {
				c := out[end]
				if (c >= '0' && c <= '9') || c == '*' || c == '-' || c == ' ' {
					end++
					continue
				}
				break
			}
			out = out[:idx] + out[end:]
		}
	}
	return out
}
