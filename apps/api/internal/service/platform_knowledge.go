package service

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
)

// PlatformAPIEnvelope 是 AI101 知识库接口的通用外层信封。
// KnowledgeService 只解这一种信封，再把 Result 交给本文件的文档解析。
type PlatformAPIEnvelope struct {
	Success      bool            `json:"success"`
	Result       json.RawMessage `json:"result"`
	Total        int             `json:"total"`
	ErrorMessage string          `json:"errorMessage"`
}

// FailError 在 success=false 时返回可读错误；success=true 返回 nil。
func (e PlatformAPIEnvelope) FailError(fallback string) error {
	if e.Success {
		return nil
	}
	msg := strings.TrimSpace(e.ErrorMessage)
	if msg == "" {
		msg = strings.TrimSpace(fallback)
	}
	if msg == "" {
		msg = "platform request failed"
	}
	return fmt.Errorf("%s", msg)
}

// PlatformDocument 是平台知识库文档的规范化视图（解析后的中间态）。
// 字段别名与嵌套包装在 UnmarshalJSON / DecodePlatformDocuments 中收敛，禁止业务层再猜字典。
type PlatformDocument struct {
	ID          string
	Title       string
	Domain      string
	GradeLevel  string
	Objectives  string
	Content     string
	KnowledgeID string
}

// 白名单：result 里可识别的列表字段（仅这些，避免无限兼容）。
var platformListKeys = []string{"list", "items", "data", "documents"}

// 白名单：单文档外层可能再包一层的键。
var platformNestKeys = []string{"document", "doc", "file", "data", "info", "record", "result", "detail"}

var (
	platformIDKeys = []string{"document_id", "id", "doc_id", "item_id"}
	platformTitleKeys = []string{"title", "name", "file_name", "display_name", "plan_name"}
	platformDomainKeys = []string{"domain", "subject", "knowledge_tag"}
	platformGradeKeys = []string{"gradeLevel", "grade_level", "grade", "class_name"}
	platformObjectiveKeys = []string{"objectives", "desc", "description", "summary", "intro"}
	platformContentKeys = []string{
		"content", "text", "markdown", "md_content", "mdContent",
		"file_content", "fileContent", "raw_text", "rawText",
		"parsed_content", "parsedContent", "full_text", "fullText",
		"body", "detail", "description", "desc",
	}
	platformKnowledgeIDKeys = []string{"knowledge_id", "knowledgeId"}
)

// PlatformMapMode 控制映射严格程度。
type PlatformMapMode int

const (
	// PlatformMapList：列表可跳过无效项；有效项必须同时有 id 与 title。
	PlatformMapList PlatformMapMode = iota
	// PlatformMapDetail：必须解析出至少一条，且首条必须有 id。
	PlatformMapDetail
	// PlatformMapUpload：必须解析出文档 id（title/content 可由调用方回填）。
	PlatformMapUpload
)

// DecodePlatformDocuments 把平台 result 解成 PlatformDocument 切片。
// 支持：数组、单对象、白名单列表包装、白名单嵌套包装。
func DecodePlatformDocuments(raw json.RawMessage) ([]PlatformDocument, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return []PlatformDocument{}, nil
	}

	var asArray []json.RawMessage
	if err := json.Unmarshal(raw, &asArray); err == nil {
		docs := make([]PlatformDocument, 0, len(asArray))
		for _, item := range asArray {
			doc, err := decodeOnePlatformDocument(item)
			if err != nil {
				return nil, err
			}
			docs = append(docs, doc)
		}
		return docs, nil
	}

	var asObj map[string]json.RawMessage
	if err := json.Unmarshal(raw, &asObj); err != nil {
		return nil, fmt.Errorf("platform result is neither object nor array: %w", err)
	}

	for _, key := range platformListKeys {
		inner, ok := asObj[key]
		if !ok || len(inner) == 0 || string(inner) == "null" {
			continue
		}
		var list []json.RawMessage
		if err := json.Unmarshal(inner, &list); err != nil {
			return nil, fmt.Errorf("platform result.%s is not an array: %w", key, err)
		}
		docs := make([]PlatformDocument, 0, len(list))
		for _, item := range list {
			doc, err := decodeOnePlatformDocument(item)
			if err != nil {
				return nil, err
			}
			docs = append(docs, doc)
		}
		return docs, nil
	}

	for _, key := range platformNestKeys {
		inner, ok := asObj[key]
		if !ok || len(inner) == 0 || string(inner) == "null" {
			continue
		}
		// 仅当内层是对象时当作单文档包装
		if len(inner) > 0 && inner[0] == '{' {
			doc, err := decodeOnePlatformDocument(inner)
			if err != nil {
				return nil, err
			}
			if doc.ID != "" || doc.Title != "" {
				return []PlatformDocument{doc}, nil
			}
		}
	}

	doc, err := decodeOnePlatformDocument(raw)
	if err != nil {
		return nil, err
	}
	if doc.ID == "" && doc.Title == "" && doc.Content == "" {
		return []PlatformDocument{}, nil
	}
	return []PlatformDocument{doc}, nil
}

func decodeOnePlatformDocument(raw json.RawMessage) (PlatformDocument, error) {
	var item map[string]any
	if err := json.Unmarshal(raw, &item); err != nil {
		return PlatformDocument{}, fmt.Errorf("platform document must be object: %w", err)
	}
	flat := flattenPlatformDocumentMap(item)
	return PlatformDocument{
		ID:          pickPlatformString(flat, platformIDKeys...),
		Title:       pickPlatformString(flat, platformTitleKeys...),
		Domain:      pickPlatformString(flat, platformDomainKeys...),
		GradeLevel:  pickPlatformString(flat, platformGradeKeys...),
		Objectives:  pickPlatformString(flat, platformObjectiveKeys...),
		Content:     pickPlatformString(flat, platformContentKeys...),
		KnowledgeID: pickPlatformString(flat, platformKnowledgeIDKeys...),
	}, nil
}

func flattenPlatformDocumentMap(item map[string]any) map[string]any {
	merged := map[string]any{}
	for k, v := range item {
		merged[k] = v
	}
	for _, wrap := range platformNestKeys {
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

// MapPlatformDocuments 把平台文档转成 TeachingPlan，并按 mode 校验。
func MapPlatformDocuments(docs []PlatformDocument, knowledgeID string, mode PlatformMapMode) ([]model.TeachingPlan, error) {
	switch mode {
	case PlatformMapDetail:
		if len(docs) == 0 {
			return nil, fmt.Errorf("empty platform document detail")
		}
		plan, err := docs[0].ToTeachingPlan(knowledgeID)
		if err != nil {
			return nil, err
		}
		return []model.TeachingPlan{plan}, nil
	case PlatformMapUpload:
		if len(docs) == 0 {
			return nil, fmt.Errorf("platform upload returned empty document")
		}
		plan, err := docs[0].ToTeachingPlan(knowledgeID)
		if err != nil {
			return nil, err
		}
		return []model.TeachingPlan{plan}, nil
	default: // PlatformMapList
		plans := make([]model.TeachingPlan, 0, len(docs))
		for _, doc := range docs {
			if strings.TrimSpace(doc.ID) == "" || strings.TrimSpace(doc.Title) == "" {
				continue
			}
			plan, err := doc.ToTeachingPlan(knowledgeID)
			if err != nil {
				continue
			}
			plans = append(plans, plan)
		}
		return plans, nil
	}
}

// ToTeachingPlan 转为对外 DTO；缺少文档 id 时失败（禁止用 title 冒充 id）。
func (d PlatformDocument) ToTeachingPlan(knowledgeID string) (model.TeachingPlan, error) {
	id := strings.TrimSpace(d.ID)
	title := strings.TrimSpace(d.Title)
	if id == "" {
		return model.TeachingPlan{}, fmt.Errorf("platform document missing id")
	}

	content := strings.TrimSpace(d.Content)
	objectives := strings.TrimSpace(d.Objectives)
	if content == "" {
		content = objectives
	}
	if objectives == "" {
		objectives = truncate(content, 100)
	}
	domain := strings.TrimSpace(d.Domain)
	if domain == "" {
		domain = "综合"
	}
	grade := strings.TrimSpace(d.GradeLevel)
	if grade == "" {
		grade = "通用"
	}
	kid := strings.TrimSpace(d.KnowledgeID)
	if kid == "" {
		kid = strings.TrimSpace(knowledgeID)
	}

	return model.TeachingPlan{
		ID:          id,
		Title:       title,
		Domain:      domain,
		GradeLevel:  grade,
		Objectives:  objectives,
		Content:     content,
		Source:      "platform",
		KnowledgeID: kid,
	}, nil
}

// mapPlatformPlans 解析 result 并按列表模式映射（缺 id/title 的项跳过）。
func mapPlatformPlans(raw json.RawMessage, knowledgeID string) ([]model.TeachingPlan, error) {
	docs, err := DecodePlatformDocuments(raw)
	if err != nil {
		return nil, err
	}
	return MapPlatformDocuments(docs, knowledgeID, PlatformMapList)
}

// mapPlatformPlansStrict 用于详情：必须有文档且有 id。
func mapPlatformPlansStrict(raw json.RawMessage, knowledgeID string, mode PlatformMapMode) ([]model.TeachingPlan, error) {
	docs, err := DecodePlatformDocuments(raw)
	if err != nil {
		return nil, err
	}
	return MapPlatformDocuments(docs, knowledgeID, mode)
}

// pickDocumentID 从上传 result 中提取文档 id（支持对象或纯字符串）。
func pickDocumentID(raw json.RawMessage) string {
	if len(raw) == 0 || string(raw) == "null" {
		return ""
	}
	docs, err := DecodePlatformDocuments(raw)
	if err == nil && len(docs) > 0 && strings.TrimSpace(docs[0].ID) != "" {
		return strings.TrimSpace(docs[0].ID)
	}
	var asString string
	if err := json.Unmarshal(raw, &asString); err == nil {
		return strings.TrimSpace(asString)
	}
	// 数字 id：{"id": 501} 已被 Decode 覆盖；纯数字 result
	var asNumber json.Number
	if err := json.Unmarshal(raw, &asNumber); err == nil {
		return asNumber.String()
	}
	return ""
}

func pickPlatformString(item map[string]any, keys ...string) string {
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
		case int:
			return strconv.Itoa(typed)
		case int64:
			return strconv.FormatInt(typed, 10)
		}
	}
	return ""
}
