package model

import "time"

var SampleItemTableName = "sample_items"

type SampleItem struct {
	ID          uint      `json:"id" gorm:"column:id;primaryKey"`
	Name        string    `json:"name" gorm:"column:name;type:varchar(512);not null"`
	Description string    `json:"description" gorm:"column:description;type:longtext"`
	CreatedAt   time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`
}

func (SampleItem) TableName() string {
	return SampleItemTableName
}
