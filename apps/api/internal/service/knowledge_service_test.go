package service

import (
	"encoding/json"
	"testing"
)

func TestMapPlatformPlansDocumentList(t *testing.T) {
	raw := json.RawMessage(`[
		{
			"document_id": 501,
			"title": "春天来了",
			"desc": "观察春天植物",
			"content": "教案正文内容",
			"category_name": "科学",
			"knowledge_id": 10298
		}
	]`)

	plans, err := mapPlatformPlans(raw, "10298")
	if err != nil {
		t.Fatalf("map platform plans: %v", err)
	}
	if len(plans) != 1 {
		t.Fatalf("expected 1 plan, got %d", len(plans))
	}
	if plans[0].ID != "501" || plans[0].Title != "春天来了" || plans[0].KnowledgeID != "10298" {
		t.Fatalf("unexpected mapped plan: %+v", plans[0])
	}
}

func TestMapPlatformPlansEmptyResult(t *testing.T) {
	plans, err := mapPlatformPlans(json.RawMessage("[]"), "10298")
	if err != nil {
		t.Fatalf("map empty plans: %v", err)
	}
	if len(plans) != 0 {
		t.Fatalf("expected empty plans, got %d", len(plans))
	}
}

func TestResolveUploadCategoryPrefersClientIDWithoutMixingEnvKey(t *testing.T) {
	cfg := KnowledgeConfig{
		ActivityCategoryID:  "20806",
		ActivityCategoryKey: "env_stale_key",
		WeeklyCategoryID:    "20807",
		WeeklyCategoryKey:   "weekly_env_key",
	}

	id, key, scrub := resolveUploadCategory(
		"王焕_活动方案_水宝宝.md",
		"activity",
		"20806",
		"", // live 解析常只给 id
		cfg,
	)
	if !scrub {
		t.Fatal("expected phone scrub for activity")
	}
	if id != "20806" {
		t.Fatalf("expected client id kept, got %q", id)
	}
	if key != "" {
		t.Fatalf("must not inject env key onto client id, got %q", key)
	}
}

func TestResolveUploadCategoryFallsBackToEnvWhenClientEmpty(t *testing.T) {
	cfg := KnowledgeConfig{
		ActivityCategoryID:  "20806",
		ActivityCategoryKey: "custom_activity",
		WeeklyCategoryID:    "20807",
		WeeklyCategoryKey:   "custom_weekly",
	}

	id, key, scrub := resolveUploadCategory("王焕_周计划_第3周.md", "", "", "", cfg)
	if !scrub {
		t.Fatal("expected scrub for weekly title")
	}
	if id != "20807" || key != "custom_weekly" {
		t.Fatalf("expected env weekly fallback, got %s / %s", id, key)
	}
}

func TestResolveUploadCategoryKeepsClientKey(t *testing.T) {
	cfg := KnowledgeConfig{
		ActivityCategoryID:  "20806",
		ActivityCategoryKey: "env_stale_key",
	}
	id, key, _ := resolveUploadCategory(
		"x_活动方案_y.md",
		"activity",
		"99999",
		"live_key",
		cfg,
	)
	if id != "99999" || key != "live_key" {
		t.Fatalf("expected client pair kept, got %s / %s", id, key)
	}
}
