package model

import "time"

var GrowthRecordTableName = "growth_records"

// GrowthRecord 教师录入成果表实体（MySQL: growth_records）。
// Keywords / Extra / Files 在库中以文本 JSON 存储，由 service 与 Payload 互转。
type GrowthRecord struct {
	ID             string    `json:"id" gorm:"column:id;primaryKey;type:varchar(64)"`
	OwnerID        string    `json:"-" gorm:"column:owner_id;type:varchar(128);not null;index"`
	Name           string    `json:"name" gorm:"column:name;type:varchar(512);not null"`
	Year           int       `json:"year" gorm:"column:year;not null;index"`
	Category       string    `json:"category" gorm:"column:category;type:varchar(64);not null;index"`
	Subtype        string    `json:"subtype" gorm:"column:subtype;type:varchar(128)"`
	Date           string    `json:"date" gorm:"column:date;type:varchar(32)"`
	Level          string    `json:"level" gorm:"column:level;type:varchar(64)"`
	Role           string    `json:"role" gorm:"column:role;type:varchar(128)"`
	Org            string    `json:"org" gorm:"column:org;type:varchar(256)"`
	Intro          string    `json:"intro" gorm:"column:intro;type:text"`
	Keywords       string    `json:"-" gorm:"column:keywords;type:text"`
	Status         string    `json:"status" gorm:"column:status;type:varchar(64)"`
	Representative bool      `json:"representative" gorm:"column:representative;not null;default:false"`
	Extra          string    `json:"-" gorm:"column:extra;type:text"`
	Files          string    `json:"-" gorm:"column:files;type:text"`
	CreatedAt      time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

func (GrowthRecord) TableName() string {
	return GrowthRecordTableName
}

type FileMeta struct {
	Name string `json:"name"`
	Type string `json:"type"`
	Size int64  `json:"size"`
}

// GrowthRecordPayload 成果库对前端的 JSON 形状（关键词/附件为结构化字段）。
type GrowthRecordPayload struct {
	ID             string         `json:"id"`
	Name           string         `json:"name"`
	Year           int            `json:"year"`
	Category       string         `json:"category"`
	Subtype        string         `json:"subtype"`
	Date           string         `json:"date"`
	Level          string         `json:"level"`
	Role           string         `json:"role"`
	Org            string         `json:"org"`
	Intro          string         `json:"intro"`
	Keywords       []string       `json:"keywords"`
	Status         string         `json:"status"`
	Representative bool           `json:"representative"`
	Extra          map[string]any `json:"extra"`
	Files          []FileMeta     `json:"files"`
	CreatedAt      string         `json:"createdAt"`
	UpdatedAt      string         `json:"updatedAt"`
}
