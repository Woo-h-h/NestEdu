package service

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
)

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

type UploadDocumentInput struct {
	KnowledgeID string `json:"knowledgeId"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	CategoryID  string `json:"categoryId"`
	CategoryKey string `json:"categoryKey"`
}

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

	categoryID := strings.TrimSpace(input.CategoryID)
	categoryKey := strings.TrimSpace(input.CategoryKey)
	contentOut := content
	// 与前端一致：标题含业务类型时强制写入教案库 / 周计划库，并清洗正文手机号
	if strings.Contains(title, "_活动方案_") {
		if id := strings.TrimSpace(s.cfg.ActivityCategoryID); id != "" {
			categoryID = id
		}
		if key := strings.TrimSpace(s.cfg.ActivityCategoryKey); key != "" {
			categoryKey = key
		}
		contentOut = scrubElevenDigitPhones(contentOut)
	} else if strings.Contains(title, "_周计划_") {
		if id := strings.TrimSpace(s.cfg.WeeklyCategoryID); id != "" {
			categoryID = id
		}
		if key := strings.TrimSpace(s.cfg.WeeklyCategoryKey); key != "" {
			categoryKey = key
		}
		contentOut = scrubElevenDigitPhones(contentOut)
	}

	body := map[string]any{
		"knowledge_id": parseIDValue(knowledgeID),
		"name":         title,
		"title":        title,
		"text":         contentOut,
		"content":      contentOut,
	}
	if categoryID != "" {
		body["category_id"] = parseIDValue(categoryID)
	}
	if categoryKey != "" {
		body["category_key"] = categoryKey
	}

	var envelope struct {
		Success      bool            `json:"success"`
		Result       json.RawMessage `json:"result"`
		ErrorMessage string          `json:"errorMessage"`
	}
	if err := s.platform.PostJSON(ctx, uploadPath, body, headers, &envelope); err != nil {
		return model.TeachingPlan{}, err
	}
	if !envelope.Success {
		msg := strings.TrimSpace(envelope.ErrorMessage)
		if msg == "" {
			msg = "platform document upload failed"
		}
		return model.TeachingPlan{}, fmt.Errorf("%s", msg)
	}

	plans, err := mapPlatformPlans(envelope.Result, knowledgeID)
	if err == nil && len(plans) > 0 {
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
		plan.Source = "platform"
		plan.KnowledgeID = knowledgeID
		return plan, nil
	}

	// 宽松回退：平台只返回 id
	docID := pickDocumentID(envelope.Result)
	return model.TeachingPlan{
		ID:          docID,
		Title:       title,
		Domain:      "综合",
		GradeLevel:  "通用",
		Objectives:  truncate(content, 100),
		Content:     content,
		Source:      "platform",
		KnowledgeID: knowledgeID,
	}, nil
}

func pickDocumentID(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	var asMap map[string]any
	if err := json.Unmarshal(raw, &asMap); err == nil {
		if id := pickString(asMap, "document_id", "id", "doc_id"); id != "" {
			return id
		}
	}
	var asString string
	if err := json.Unmarshal(raw, &asString); err == nil {
		return strings.TrimSpace(asString)
	}
	return ""
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
	var envelope struct {
		Success      bool            `json:"success"`
		Result       json.RawMessage `json:"result"`
		Total        int             `json:"total"`
		ErrorMessage string          `json:"errorMessage"`
	}

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
	if !envelope.Success {
		msg := strings.TrimSpace(envelope.ErrorMessage)
		if msg == "" {
			msg = "platform document list failed"
		}
		return nil, 0, fmt.Errorf("%s", msg)
	}

	items, err := mapPlatformPlans(envelope.Result, knowledgeID)
	if err != nil {
		return nil, 0, err
	}
	return items, envelope.Total, nil
}

func (s *KnowledgeService) getDocument(ctx context.Context, headers ForwardHeaders, id string) (model.TeachingPlan, error) {
	var envelope struct {
		Success      bool            `json:"success"`
		Result       json.RawMessage `json:"result"`
		ErrorMessage string          `json:"errorMessage"`
	}

	detailPath := strings.TrimSpace(s.cfg.DetailPath)
	if detailPath == "" {
		detailPath = "/api/knowledge/document/detail"
	}

	query := url.Values{"document_id": {id}}
	if err := s.platform.GetJSON(ctx, detailPath, query, headers, &envelope); err != nil {
		return model.TeachingPlan{}, err
	}
	if !envelope.Success {
		msg := strings.TrimSpace(envelope.ErrorMessage)
		if msg == "" {
			msg = "platform document detail failed"
		}
		return model.TeachingPlan{}, fmt.Errorf("%s", msg)
	}

	plans, err := mapPlatformPlans(envelope.Result, "")
	if err != nil || len(plans) == 0 {
		return model.TeachingPlan{}, fmt.Errorf("empty platform document detail")
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

	var envelope struct {
		Success      bool   `json:"success"`
		ErrorMessage string `json:"errorMessage"`
	}
	body := map[string]any{"id": parseIDValue(id)}
	if err := s.platform.DeleteJSON(ctx, deletePath, body, headers, &envelope); err != nil {
		return err
	}
	if envelope.Success == false {
		msg := strings.TrimSpace(envelope.ErrorMessage)
		if msg == "" {
			msg = "platform document delete failed"
		}
		return fmt.Errorf("%s", msg)
	}
	return nil
}

func mapPlatformPlans(raw json.RawMessage, knowledgeID string) ([]model.TeachingPlan, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return []model.TeachingPlan{}, nil
	}

	var direct []map[string]any
	if err := json.Unmarshal(raw, &direct); err == nil {
		return mapPlanMaps(direct, knowledgeID), nil
	}

	var wrapped struct {
		List      []map[string]any `json:"list"`
		Items     []map[string]any `json:"items"`
		Data      []map[string]any `json:"data"`
		Documents []map[string]any `json:"documents"`
	}
	if err := json.Unmarshal(raw, &wrapped); err != nil {
		return nil, err
	}
	switch {
	case len(wrapped.List) > 0:
		return mapPlanMaps(wrapped.List, knowledgeID), nil
	case len(wrapped.Items) > 0:
		return mapPlanMaps(wrapped.Items, knowledgeID), nil
	case len(wrapped.Data) > 0:
		return mapPlanMaps(wrapped.Data, knowledgeID), nil
	case len(wrapped.Documents) > 0:
		return mapPlanMaps(wrapped.Documents, knowledgeID), nil
	default:
		var single map[string]any
		if err := json.Unmarshal(raw, &single); err == nil && len(single) > 0 {
			return mapPlanMaps([]map[string]any{single}, knowledgeID), nil
		}
	}
	return []model.TeachingPlan{}, nil
}

func flattenDocumentFields(item map[string]any) map[string]any {
	merged := map[string]any{}
	for k, v := range item {
		merged[k] = v
	}
	for _, wrap := range []string{"document", "doc", "file", "data", "info", "record", "result", "detail"} {
		inner, ok := item[wrap]
		if !ok || inner == nil {
			continue
		}
		if nested, ok := inner.(map[string]any); ok {
			for k, v := range nested {
				merged[k] = v
			}
		}
	}
	return merged
}

func mapPlanMaps(items []map[string]any, knowledgeID string) []model.TeachingPlan {
	plans := make([]model.TeachingPlan, 0, len(items))
	for _, raw := range items {
		item := flattenDocumentFields(raw)
		plan := model.TeachingPlan{
			ID:          pickString(item, "document_id", "id", "doc_id", "item_id"),
			Title:       pickString(item, "title", "name", "file_name", "display_name", "plan_name"),
			Domain:      pickString(item, "domain", "subject", "knowledge_tag"),
			GradeLevel:  pickString(item, "gradeLevel", "grade_level", "grade", "class_name"),
			Objectives:  pickString(item, "objectives", "desc", "description", "summary", "intro"),
			Content: pickString(item,
				"content", "text", "markdown", "md_content", "mdContent",
				"file_content", "fileContent", "raw_text", "rawText",
				"parsed_content", "parsedContent", "full_text", "fullText",
				"body", "detail", "description", "desc",
			),
			Source:      "platform",
			KnowledgeID: pickString(item, "knowledge_id", "knowledgeId"),
		}
		if plan.KnowledgeID == "" {
			plan.KnowledgeID = knowledgeID
		}
		if plan.Title == "" {
			continue
		}
		if plan.ID == "" {
			plan.ID = plan.Title
		}
		if plan.Content == "" {
			plan.Content = plan.Objectives
		}
		if plan.Objectives == "" {
			plan.Objectives = truncate(plan.Content, 100)
		}
		if plan.Domain == "" {
			plan.Domain = "综合"
		}
		if plan.GradeLevel == "" {
			plan.GradeLevel = "通用"
		}
		plans = append(plans, plan)
	}
	return plans
}

func pickString(item map[string]any, keys ...string) string {
	for _, key := range keys {
		value, ok := item[key]
		if !ok || value == nil {
			continue
		}
		switch typed := value.(type) {
		case string:
			if strings.TrimSpace(typed) != "" {
				return strings.TrimSpace(typed)
			}
		case float64:
			return strconv.FormatInt(int64(typed), 10)
		case json.Number:
			return typed.String()
		}
	}
	return ""
}

func parseIDValue(id string) any {
	if n, err := strconv.Atoi(id); err == nil {
		return n
	}
	return id
}

// scrubElevenDigitPhones 避免正文完整手机号触发平台智能分类进成果库手机号文件夹。
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
				b.WriteString(string(runes[i:i+3]) + "****" + string(runes[i+7:i+11]))
				i += 11
				continue
			}
		}
		b.WriteRune(runes[i])
		i++
	}
	return b.String()
}
