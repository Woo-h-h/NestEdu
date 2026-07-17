package model

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

type ListKnowledgePlansParams struct {
	Keyword     string
	KnowledgeID string
	Page        int
	Limit       int
}

type ListKnowledgePlansResult struct {
	Items []TeachingPlan `json:"items"`
	Total int            `json:"total"`
	Page  int            `json:"page"`
	Limit int            `json:"limit"`
	Source string        `json:"source"`
}
