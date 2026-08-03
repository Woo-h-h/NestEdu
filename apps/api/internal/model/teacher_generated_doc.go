package model

import "time"

var TeacherGeneratedDocTableName = "teacher_generated_docs"

// TeacherGeneratedDoc 记录教师本人成功入库的教案/周计划，供成果库与画像按人统计。
type TeacherGeneratedDoc struct {
	ID             string    `json:"id" gorm:"column:id;primaryKey;type:varchar(64)"`
	Phone          string    `json:"phone" gorm:"column:phone;type:varchar(32);not null;index"`
	OwnerID        string    `json:"-" gorm:"column:owner_id;type:varchar(128);not null;index"`
	DocType        string    `json:"docType" gorm:"column:doc_type;type:varchar(32);not null;index"` // activity | weekly
	KnowledgeDocID string    `json:"knowledgeDocId" gorm:"column:knowledge_doc_id;type:varchar(128);not null;uniqueIndex"`
	Title          string    `json:"title" gorm:"column:title;type:varchar(512);not null"`
	KnowledgeID    string    `json:"knowledgeId" gorm:"column:knowledge_id;type:varchar(64)"`
	CategoryID     string    `json:"categoryId" gorm:"column:category_id;type:varchar(64)"`
	CreatedAt      time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

func (TeacherGeneratedDoc) TableName() string {
	return TeacherGeneratedDocTableName
}

type TeacherGeneratedDocPayload struct {
	ID             string `json:"id"`
	Phone          string `json:"phone"`
	DocType        string `json:"docType"`
	KnowledgeDocID string `json:"knowledgeDocId"`
	Title          string `json:"title"`
	KnowledgeID    string `json:"knowledgeId"`
	CategoryID     string `json:"categoryId"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
}

type TeacherGeneratedDocStats struct {
	Phone    string `json:"phone"`
	Activity int64  `json:"activity"`
	Weekly   int64  `json:"weekly"`
	Total    int64  `json:"total"`
}
