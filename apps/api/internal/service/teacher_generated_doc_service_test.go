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
	// other teacher should not affect stats
	_, err = svc.Save(context.Background(), "other", model.TeacherGeneratedDocPayload{
		Phone:          "13900139000",
		DocType:        "activity",
		KnowledgeDocID: "doc_a2",
		Title:          "别人的",
	})
	if err != nil {
		t.Fatalf("save other: %v", err)
	}

	stats, err := svc.Stats(context.Background(), phone)
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

	list, err := svc.List(context.Background(), phone, "activity")
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
				t.Fatalf("content mismatch: %q", row.Content)
			}
		}
	}
	if !found {
		t.Fatal("mysql-only row not listed")
	}
}
