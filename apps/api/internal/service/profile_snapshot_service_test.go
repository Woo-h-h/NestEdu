package service

import (
	"context"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestProfileSnapshotReplaceByPhone(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.ProfileSnapshot{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	svc := NewProfileSnapshotService(store.NewProfileSnapshotStore(db))
	phone := "13800138000"

	first, err := svc.Save(context.Background(), "owner_a", model.ProfileSnapshotPayload{
		Phone:            phone,
		DisplayName:      "张老师",
		AgentID:          14372,
		Markdown:         "## 旧画像\n第一版",
		ArchiveDocCount:  1,
		LocalRecordCount: 0,
		FolderIDs:        []string{"f1"},
	})
	if err != nil {
		t.Fatalf("save first: %v", err)
	}
	if first.Phone != phone || first.Markdown == "" {
		t.Fatalf("unexpected first payload: %+v", first)
	}

	second, err := svc.Save(context.Background(), "owner_a", model.ProfileSnapshotPayload{
		Phone:            phone,
		DisplayName:      "张老师",
		AgentID:          14372,
		Markdown:         "## 新画像\n第二版",
		ArchiveDocCount:  3,
		LocalRecordCount: 2,
		FolderIDs:        []string{"f1", "f2"},
	})
	if err != nil {
		t.Fatalf("save second: %v", err)
	}
	if second.Markdown != "## 新画像\n第二版" {
		t.Fatalf("expected replaced markdown, got %q", second.Markdown)
	}

	got, err := svc.GetByPhone(context.Background(), phone)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Markdown != second.Markdown {
		t.Fatalf("get mismatch: %+v", got)
	}

	var count int64
	if err := db.Model(&model.ProfileSnapshot{}).Where("phone = ?", phone).Count(&count).Error; err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 row per phone, got %d", count)
	}
}
