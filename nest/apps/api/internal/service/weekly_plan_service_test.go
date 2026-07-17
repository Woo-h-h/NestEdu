package service

import (
	"context"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestWeeklyPlanServiceSaveAndDelete(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.WeeklyPlan{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	svc := NewWeeklyPlanService(store.NewWeeklyPlanStore(db))
	owner := "user_1"

	payload := model.WeeklyPlanPayload{
		ID:          "plan_1",
		ThemeName:   "亲亲自然",
		ClassName:   "小班",
		WeekNumber:  2,
		WeeklyFocus: "重点",
		DailyPlans: []model.DayPlan{
			{Day: "周一", CollectiveLearning: "a", RegionalGames: "b", DailyLife: "c", OutdoorSports: "d"},
			{Day: "周二", CollectiveLearning: "a", RegionalGames: "b", DailyLife: "c", OutdoorSports: "d"},
			{Day: "周三", CollectiveLearning: "a", RegionalGames: "b", DailyLife: "c", OutdoorSports: "d"},
			{Day: "周四", CollectiveLearning: "a", RegionalGames: "b", DailyLife: "c", OutdoorSports: "d"},
			{Day: "周五", CollectiveLearning: "a", RegionalGames: "b", DailyLife: "c", OutdoorSports: "d"},
		},
		Suggestions: "建议",
		Status:      "saved",
	}

	saved, err := svc.SavePlan(context.Background(), owner, payload)
	if err != nil {
		t.Fatalf("save plan: %v", err)
	}
	if saved.ID != "plan_1" {
		t.Fatalf("unexpected saved id: %s", saved.ID)
	}

	list, err := svc.ListPlans(context.Background(), owner)
	if err != nil || len(list) != 1 {
		t.Fatalf("list plans: %+v err=%v", list, err)
	}

	if err := svc.DeletePlan(context.Background(), owner, "plan_1"); err != nil {
		t.Fatalf("delete plan: %v", err)
	}
}
