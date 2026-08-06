package model

// TeachingPlan 教案 / 活动方案在 API 中的形状（DTO，非 MySQL 表）。
// 由 KnowledgeService / LLMService 从平台知识库或智能体响应映射而来。
type TeachingPlan struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Domain      string `json:"domain"`
	GradeLevel  string `json:"gradeLevel"`
	Objectives  string `json:"objectives"`
	Content     string `json:"content"`
	Source      string `json:"source,omitempty"`
	KnowledgeID string `json:"knowledgeId,omitempty"`
}

// ListKnowledgePlansParams 知识库教案列表查询入参（不序列化到 DB）。
type ListKnowledgePlansParams struct {
	Keyword     string
	KnowledgeID string
	CategoryID  string
	CategoryKey string
	Page        int
	Limit       int
}

// ListKnowledgePlansResult 知识库教案列表出参。
type ListKnowledgePlansResult struct {
	Items  []TeachingPlan `json:"items"`
	Total  int            `json:"total"`
	Page   int            `json:"page"`
	Limit  int            `json:"limit"`
	Source string         `json:"source"`
}
