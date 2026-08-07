package model

import "time"

var ProfileActionBundleTableName = "profile_action_bundles"

// ProfileActionBundle 教师画像行动计划状态包（MySQL: profile_action_bundles）。
// 同一 owner 一份 JSON map：actionId → {checked,status,date,progress}。
type ProfileActionBundle struct {
	OwnerID   string    `json:"-" gorm:"column:owner_id;primaryKey;type:varchar(128)"`
	States    string    `json:"-" gorm:"column:states;type:text;not null"`
	UpdatedAt time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
	CreatedAt time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
}

func (ProfileActionBundle) TableName() string {
	return ProfileActionBundleTableName
}

// ProfileActionState 单条行动计划进度（对前端）。
type ProfileActionState struct {
	Checked  bool   `json:"checked"`
	Status   string `json:"status"` // planned | completed | dismissed
	Date     string `json:"date"`
	Progress int    `json:"progress"`
}

type ProfileActionBundlePayload struct {
	States    map[string]ProfileActionState `json:"states"`
	UpdatedAt string                        `json:"updatedAt,omitempty"`
}

type ProfileActionPatchPayload struct {
	ID       string `json:"id"`
	Checked  *bool  `json:"checked"`
	Status   string `json:"status"`
	Date     string `json:"date"`
	Progress *int   `json:"progress"`
}
