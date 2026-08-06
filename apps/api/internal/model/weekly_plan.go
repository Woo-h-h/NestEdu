package model

import "time"

var WeeklyPlanTableName = "weekly_plans"

// WeeklyPlan 本地周计划表实体（MySQL: weekly_plans）；DailyPlans 在库中为 JSON 文本。
type WeeklyPlan struct {
	ID          string    `json:"id" gorm:"column:id;primaryKey;type:varchar(64)"`
	OwnerID     string    `json:"-" gorm:"column:owner_id;type:varchar(128);not null;index"`
	ThemeName   string    `json:"themeName" gorm:"column:theme_name;type:varchar(512);not null"`
	ClassName   string    `json:"className" gorm:"column:class_name;type:varchar(128);not null"`
	WeekNumber  int       `json:"weekNumber" gorm:"column:week_number;not null"`
	WeeklyFocus string    `json:"weeklyFocus" gorm:"column:weekly_focus;type:text"`
	DailyPlans  string    `json:"-" gorm:"column:daily_plans;type:text;not null"`
	Suggestions string    `json:"suggestions" gorm:"column:suggestions;type:text"`
	Status      string    `json:"status" gorm:"column:status;type:varchar(64);not null"`
	CreatedAt   time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
}

func (WeeklyPlan) TableName() string {
	return WeeklyPlanTableName
}

type DayPlan struct {
	Day                string `json:"day"`
	CollectiveLearning string `json:"collectiveLearning"`
	RegionalGames      string `json:"regionalGames"`
	DailyLife          string `json:"dailyLife"`
	OutdoorSports      string `json:"outdoorSports"`
}

// WeeklyPlanPayload 周计划对前端的 JSON 形状（DailyPlans 为结构化数组）。
type WeeklyPlanPayload struct {
	ID          string    `json:"id"`
	ThemeName   string    `json:"themeName"`
	ClassName   string    `json:"className"`
	WeekNumber  int       `json:"weekNumber"`
	WeeklyFocus string    `json:"weeklyFocus"`
	DailyPlans  []DayPlan `json:"dailyPlans"`
	Suggestions string    `json:"suggestions"`
	CreatedAt   string    `json:"createdAt"`
	Status      string    `json:"status"`
}
