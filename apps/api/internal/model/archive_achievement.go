package model

import "time"

var ArchiveAchievementTableName = "archive_achievements"

// ArchiveAchievement 教师成果库文档的本地分类映射（GORM：MySQL / PostgreSQL）。
// TreeCategory：practice=特色实践 / research=教研科研 / honor=专业荣誉。
type ArchiveAchievement struct {
	ID               string    `json:"id" gorm:"column:id;primaryKey;type:varchar(64)"`
	Phone            string    `json:"phone" gorm:"column:phone;type:varchar(32);not null;index"`
	OwnerID          string    `json:"-" gorm:"column:owner_id;type:varchar(128);not null;index"`
	KnowledgeDocID   string    `json:"knowledgeDocId" gorm:"column:knowledge_doc_id;type:varchar(128);not null;uniqueIndex"`
	Title            string    `json:"title" gorm:"column:title;type:varchar(512);not null"`
	TreeCategory     string    `json:"treeCategory" gorm:"column:tree_category;type:varchar(32);not null;index"`
	Year             int       `json:"year" gorm:"column:year;not null;index"`
	MaterialType     string    `json:"materialType" gorm:"column:material_type;type:varchar(64)"`
	Summary          string    `json:"summary" gorm:"column:summary;type:text"`
	NeedsHumanReview bool      `json:"needsHumanReview" gorm:"column:needs_human_review;not null;default:false"`
	KnowledgeID      string    `json:"knowledgeId" gorm:"column:knowledge_id;type:varchar(64)"`
	CategoryID       string    `json:"categoryId" gorm:"column:category_id;type:varchar(64)"`
	CreatedAt        time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt        time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

func (ArchiveAchievement) TableName() string {
	return ArchiveAchievementTableName
}

type ArchiveAchievementPayload struct {
	ID               string `json:"id"`
	Phone            string `json:"phone"`
	KnowledgeDocID   string `json:"knowledgeDocId"`
	Title            string `json:"title"`
	TreeCategory     string `json:"treeCategory"`
	Year             int    `json:"year"`
	MaterialType     string `json:"materialType"`
	Summary          string `json:"summary"`
	NeedsHumanReview bool   `json:"needsHumanReview"`
	KnowledgeID      string `json:"knowledgeId"`
	CategoryID       string `json:"categoryId"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}
