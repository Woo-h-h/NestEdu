package service

import (
	"context"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestProfileActionPatchAndReplace(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&model.ProfileActionBundle{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	svc := NewProfileActionService(store.NewProfileActionStore(db))

	empty, err := svc.Get(context.Background(), "owner_a")
	if err != nil {
		t.Fatalf("get empty: %v", err)
	}
	if len(empty.States) != 0 {
		t.Fatalf("expected empty states, got %+v", empty.States)
	}

	checked := true
	progress := 100
	patched, err := svc.Patch(context.Background(), "owner_a", model.ProfileActionPatchPayload{
		ID:       "act_1",
		Checked:  &checked,
		Status:   "completed",
		Date:     "2026-08-07",
		Progress: &progress,
	})
	if err != nil {
		t.Fatalf("patch: %v", err)
	}
	st := patched.States["act_1"]
	if !st.Checked || st.Status != "completed" || st.Progress != 100 || st.Date != "2026-08-07" {
		t.Fatalf("unexpected patch state: %+v", st)
	}

	other, err := svc.Get(context.Background(), "owner_b")
	if err != nil {
		t.Fatalf("get other: %v", err)
	}
	if len(other.States) != 0 {
		t.Fatalf("other owner should be empty")
	}

	replaced, err := svc.Replace(context.Background(), "owner_a", map[string]model.ProfileActionState{
		"act_2": {Checked: false, Status: "planned", Progress: 10},
	})
	if err != nil {
		t.Fatalf("replace: %v", err)
	}
	if _, ok := replaced.States["act_1"]; ok {
		t.Fatal("replace should drop act_1")
	}
	if replaced.States["act_2"].Progress != 10 {
		t.Fatalf("unexpected replace: %+v", replaced.States)
	}
}
