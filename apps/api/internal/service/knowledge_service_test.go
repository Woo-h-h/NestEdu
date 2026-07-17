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
