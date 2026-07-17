package model

import "time"

var WeeklyPlanTableName = "weekly_plans"

type WeeklyPlan struct {
	ID           string    `json:"id" gorm:"column:id;primaryKey;type:text"`
	OwnerID      string    `json:"-" gorm:"column:owner_id;type:text;not null;index"`
	ThemeName    string    `json:"themeName" gorm:"column:theme_name;type:text;not null"`
	ClassName    string    `json:"className" gorm:"column:class_name;type:text;not null"`
	WeekNumber   int       `json:"weekNumber" gorm:"column:week_number;not null"`
	WeeklyFocus  string    `json:"weeklyFocus" gorm:"column:weekly_focus;type:text"`
	DailyPlans   string    `json:"-" gorm:"column:daily_plans;type:text;not null"`
	Suggestions  string    `json:"suggestions" gorm:"column:suggestions;type:text"`
	Status       string    `json:"status" gorm:"column:status;type:text;not null"`
	CreatedAt    time.Time `json:"createdAt" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time `json:"updatedAt" gorm:"column:updated_at;autoUpdateTime"`
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
