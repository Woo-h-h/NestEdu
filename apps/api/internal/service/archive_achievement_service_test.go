package service

import (
	"context"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestNormalizeTreeCategory(t *testing.T) {
	cases := map[string]string{
		"特色实践":     "practice",
		"教研科研":     "research",
		"专业荣誉":     "honor",
		"research": "research",
		"公开课实录":    "research",
		"园级表彰证书":   "honor",
		"环境创设照片":   "practice",
		"":         "practice",
	}
	for in, want := range cases {
		if got := NormalizeTreeCategory(in); got != want {
			t.Fatalf("NormalizeTreeCategory(%q)=%q want %q", in, got, want)
		}
	}
}

func TestArchiveAchievementSaveAndList(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.ArchiveAchievement{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewArchiveAchievementService(store.NewArchiveAchievementStore(db))
	phone := "13800138000"

	saved, err := svc.Save(context.Background(), "owner", model.ArchiveAchievementPayload{
		Phone:          phone,
		KnowledgeDocID: "doc_1",
		Title:          "自然角环境创设",
		TreeCategory:   "特色实践",
		Year:           2026,
		MaterialType:   "环境创设",
		Summary:        "班级自然角迭代",
	})
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	if saved.TreeCategory != "practice" || saved.Year != 2026 {
		t.Fatalf("unexpected saved: %+v", saved)
	}

	rows, err := svc.List(context.Background(), "owner", phone, 1, 20)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(rows) != 1 || rows[0].KnowledgeDocID != "doc_1" {
		t.Fatalf("unexpected list: %+v", rows)
	}
}
