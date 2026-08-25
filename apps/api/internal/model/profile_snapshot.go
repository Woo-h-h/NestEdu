package model

import "time"

var ProfileSnapshotTableName = "profile_snapshots"

// ProfileSnapshot 教师智能画像快照表实体（MySQL: profile_snapshots）：同一手机号仅保留一份，新生成覆盖旧记录。
type ProfileSnapshot struct {
	ID                string    `json:"id" gorm:"column:id;primaryKey;type:varchar(64)"`
	Phone             string    `json:"phone" gorm:"column:phone;type:varchar(32);not null;uniqueIndex"`
	OwnerID           string    `json:"-" gorm:"column:owner_id;type:varchar(128);not null;index"`
	DisplayName       string    `json:"displayName" gorm:"column:display_name;type:varchar(128)"`
	AgentID           int       `json:"agentId" gorm:"column:agent_id"`
	Markdown          string    `json:"markdown" gorm:"column:markdown;type:text;not null"`
	ArchiveDocCount   int       `json:"archiveDocCount" gorm:"column:archive_doc_count"`
	ActivityPlanCount int       `json:"activityPlanCount" gorm:"column:activity_plan_count"`
	WeeklyPlanCount   int       `json:"weeklyPlanCount" gorm:"column:weekly_plan_count"`
	LocalRecordCount  int       `json:"localRecordCount" gorm:"column:local_record_count"`
	FolderIDsJSON     string    `json:"-" gorm:"column:folder_ids_json;type:text"`
	GeneratedAt       time.Time `json:"generatedAt" gorm:"column:generated_at;not null"`
	CreatedAt         time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt         time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

func (ProfileSnapshot) TableName() string {
	return ProfileSnapshotTableName
}

type ProfileSnapshotPayload struct {
	ID                string   `json:"id"`
	Phone             string   `json:"phone"`
	DisplayName       string   `json:"displayName"`
	AgentID           int      `json:"agentId"`
	Markdown          string   `json:"markdown"`
	ArchiveDocCount   int      `json:"archiveDocCount"`
	ActivityPlanCount int      `json:"activityPlanCount"`
	WeeklyPlanCount   int      `json:"weeklyPlanCount"`
	LocalRecordCount  int      `json:"localRecordCount"`
	FolderIDs         []string `json:"folderIds"`
	GeneratedAt       string   `json:"generatedAt"`
	CreatedAt         string   `json:"createdAt"`
	UpdatedAt         string   `json:"updatedAt"`
}
