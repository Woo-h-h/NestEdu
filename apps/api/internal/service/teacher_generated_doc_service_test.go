package service

import (
	"context"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestTeacherGeneratedDocStatsByPhone(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.TeacherGeneratedDoc{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	svc := NewTeacherGeneratedDocService(store.NewTeacherGeneratedDocStore(db))
	phone := "13800138000"

	_, err = svc.Save(context.Background(), "owner", model.TeacherGeneratedDocPayload{
		Phone:          phone,
		DocType:        "activity",
		KnowledgeDocID: "doc_a1",
		Title:          "活动A",
	})
	if err != nil {
		t.Fatalf("save activity: %v", err)
	}
	_, err = svc.Save(context.Background(), "owner", model.TeacherGeneratedDocPayload{
		Phone:          phone,
		DocType:        "weekly",
		KnowledgeDocID: "doc_w1",
		Title:          "周计划B",
	})
	if err != nil {
		t.Fatalf("save weekly: %v", err)
	}
	_, err = svc.Save(context.Background(), "other", model.TeacherGeneratedDocPayload{
		Phone:          "13900139000",
		DocType:        "activity",
		KnowledgeDocID: "doc_a2",
		Title:          "别人的",
	})
	if err != nil {
		t.Fatalf("save other: %v", err)
	}

	stats, err := svc.Stats(context.Background(), "owner", phone)
	if err != nil {
		t.Fatalf("stats: %v", err)
	}
	if stats.Activity != 1 || stats.Weekly != 1 || stats.Total != 2 {
		t.Fatalf("unexpected stats: %+v", stats)
	}
}

func TestTeacherGeneratedDocMysqlOnlyStorage(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.TeacherGeneratedDoc{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	svc := NewTeacherGeneratedDocService(store.NewTeacherGeneratedDocStore(db))
	phone := "13800138000"

	_, err = svc.Save(context.Background(), "owner", model.TeacherGeneratedDocPayload{
		Phone:          phone,
		DocType:        "activity",
		KnowledgeDocID: "local_private_1",
		Title:          "私有活动",
		Storage:        "mysql",
		Content:        "仅本人可见正文",
	})
	if err != nil {
		t.Fatalf("save mysql-only: %v", err)
	}

	_, err = svc.Save(context.Background(), "owner", model.TeacherGeneratedDocPayload{
		Phone:          phone,
		DocType:        "activity",
		KnowledgeDocID: "local_empty",
		Title:          "缺正文",
		Storage:        "mysql",
	})
	if err == nil {
		t.Fatal("expected content required error")
	}

	list, err := svc.List(context.Background(), "owner", phone, "activity", 1, 50)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	var found bool
	for _, row := range list {
		if row.KnowledgeDocID == "local_private_1" {
			found = true
			if row.Storage != "mysql" {
				t.Fatalf("expected storage=mysql, got %q", row.Storage)
			}
			if row.Content != "仅本人可见正文" {
				t.Fatalf("mysql list should include content, got %q", row.Content)
			}
		}
	}
	if !found {
		t.Fatal("mysql-only row not listed")
	}
}

func TestTeacherGeneratedDocScopedByOwner(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.TeacherGeneratedDoc{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewTeacherGeneratedDocService(store.NewTeacherGeneratedDocStore(db))
	phone := "13800138000"
	_, err = svc.Save(context.Background(), "owner_a", model.TeacherGeneratedDocPayload{
		Phone: phone, DocType: "activity", KnowledgeDocID: "doc_x", Title: "A",
	})
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	stats, err := svc.Stats(context.Background(), "owner_b", phone)
	if err != nil {
		t.Fatalf("stats: %v", err)
	}
	if stats.Total != 0 {
		t.Fatalf("other owner should see 0, got %+v", stats)
	}
}

func TestTeacherGeneratedDocPersistsYear(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.TeacherGeneratedDoc{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewTeacherGeneratedDocService(store.NewTeacherGeneratedDocStore(db))
	phone := "13800138000"

	saved, err := svc.Save(context.Background(), "owner", model.TeacherGeneratedDocPayload{
		Phone:          phone,
		DocType:        "activity",
		KnowledgeDocID: "doc_year_1",
		Title:          "春季主题活动",
		Year:           2024,
	})
	if err != nil {
		t.Fatalf("save: %v", err)
	}
	if saved.Year != 2024 {
		t.Fatalf("expected year 2024, got %d", saved.Year)
	}

	fromTitle, err := svc.Save(context.Background(), "owner", model.TeacherGeneratedDocPayload{
		Phone:          phone,
		DocType:        "weekly",
		KnowledgeDocID: "doc_year_2",
		Title:          "2023年第二周计划",
	})
	if err != nil {
		t.Fatalf("save from title: %v", err)
	}
	if fromTitle.Year != 2023 {
		t.Fatalf("expected year 2023 from title, got %d", fromTitle.Year)
	}

	_, err = svc.Save(context.Background(), "owner", model.TeacherGeneratedDocPayload{
		Phone:          phone,
		DocType:        "activity",
		KnowledgeDocID: "doc_year_bad",
		Title:          "无效年份",
		Year:           1800,
	})
	if err == nil {
		t.Fatal("expected invalid year error")
	}
}
