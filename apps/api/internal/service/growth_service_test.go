package service

import (
	"context"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestGrowthServiceSaveAndDelete(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.GrowthRecord{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	svc := NewGrowthService(store.NewGrowthStore(db))
	owner := "user_1"

	payload := model.GrowthRecordPayload{
		ID:       "growth_1",
		Name:     "幼儿园自主游戏案例研究",
		Year:     2025,
		Category: "专业研究成果",
		Subtype:  "案例",
		Date:     "2025-03-15",
		Level:    "区级",
		Role:     "第一作者",
		Org:      "华科附幼",
		Intro:    "案例简介",
		Keywords: []string{"自主游戏", "案例"},
		Status:   "已完成",
		Extra: map[string]any{
			"publication": "学前教育研究",
		},
		Files: []model.FileMeta{
			{Name: "paper.pdf", Type: "application/pdf", Size: 1024},
		},
	}

	saved, err := svc.SaveRecord(context.Background(), owner, payload)
	if err != nil {
		t.Fatalf("save record: %v", err)
	}
	if saved.ID != "growth_1" {
		t.Fatalf("unexpected saved id: %s", saved.ID)
	}
	if len(saved.Keywords) != 2 {
		t.Fatalf("unexpected keywords: %+v", saved.Keywords)
	}

	list, err := svc.ListRecords(context.Background(), owner, store.GrowthListFilter{})
	if err != nil || len(list) != 1 {
		t.Fatalf("list records: %+v err=%v", list, err)
	}

	if err := svc.DeleteRecord(context.Background(), owner, "growth_1"); err != nil {
		t.Fatalf("delete record: %v", err)
	}
}
