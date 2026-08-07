package service

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func loadPlatformFixture(t *testing.T, name string) []byte {
	t.Helper()
	path := filepath.Join("testdata", "platform_knowledge", name)
	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read fixture %s: %v", name, err)
	}
	return raw
}

func TestGoldenListWrapped(t *testing.T) {
	raw := loadPlatformFixture(t, "list_wrapped.json")
	var envelope PlatformAPIEnvelope
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("unmarshal envelope: %v", err)
	}
	if err := envelope.FailError("list failed"); err != nil {
		t.Fatalf("envelope should succeed: %v", err)
	}
	if envelope.Total != 2 {
		t.Fatalf("expected total 2, got %d", envelope.Total)
	}

	plans, err := mapPlatformPlans(envelope.Result, "10298")
	if err != nil {
		t.Fatalf("map list: %v", err)
	}
	if len(plans) != 2 {
		t.Fatalf("expected 2 plans, got %d", len(plans))
	}
	if plans[0].ID != "501" || plans[0].Title != "春天来了" || plans[0].Content != "教案正文内容" {
		t.Fatalf("unexpected first plan: %+v", plans[0])
	}
	if plans[1].ID != "502" || plans[1].Title != "亲亲自然周计划" {
		t.Fatalf("unexpected second plan: %+v", plans[1])
	}
}

func TestGoldenDetailNested(t *testing.T) {
	raw := loadPlatformFixture(t, "detail_nested.json")
	var envelope PlatformAPIEnvelope
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("unmarshal envelope: %v", err)
	}

	plans, err := mapPlatformPlansStrict(envelope.Result, "10298", PlatformMapDetail)
	if err != nil {
		t.Fatalf("map detail: %v", err)
	}
	plan := plans[0]
	if plan.ID != "501" {
		t.Fatalf("expected id 501, got %q", plan.ID)
	}
	if plan.Title != "春天来了" {
		t.Fatalf("expected title, got %q", plan.Title)
	}
	if plan.Content != "# 活动目标\n观察春天" {
		t.Fatalf("expected md_content mapped, got %q", plan.Content)
	}
	if plan.Domain != "科学" || plan.GradeLevel != "中班" {
		t.Fatalf("unexpected domain/grade: %+v", plan)
	}
}

func TestGoldenUploadThin(t *testing.T) {
	raw := loadPlatformFixture(t, "upload_thin.json")
	var envelope PlatformAPIEnvelope
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("unmarshal envelope: %v", err)
	}

	plans, err := mapPlatformPlansStrict(envelope.Result, "10298", PlatformMapUpload)
	if err != nil {
		t.Fatalf("map upload: %v", err)
	}
	if plans[0].ID != "9001" {
		t.Fatalf("expected upload id 9001, got %q", plans[0].ID)
	}
	if plans[0].Title != "上传成功文档" {
		t.Fatalf("expected name as title, got %q", plans[0].Title)
	}
}

func TestGoldenListSkipsMissingID(t *testing.T) {
	raw := loadPlatformFixture(t, "list_skip_missing_id.json")
	var envelope PlatformAPIEnvelope
	if err := json.Unmarshal(raw, &envelope); err != nil {
		t.Fatalf("unmarshal envelope: %v", err)
	}

	plans, err := mapPlatformPlans(envelope.Result, "10298")
	if err != nil {
		t.Fatalf("map list: %v", err)
	}
	if len(plans) != 1 {
		t.Fatalf("expected only valid item kept, got %d: %+v", len(plans), plans)
	}
	if plans[0].ID != "777" {
		t.Fatalf("expected id 777, got %q", plans[0].ID)
	}
}

func TestDetailRejectsMissingID(t *testing.T) {
	raw := json.RawMessage(`{"title":"无ID详情","content":"x"}`)
	_, err := mapPlatformPlansStrict(raw, "10298", PlatformMapDetail)
	if err == nil {
		t.Fatal("expected error for detail without id")
	}
}

func TestPickDocumentIDBareString(t *testing.T) {
	if got := pickDocumentID(json.RawMessage(`"abc-1"`)); got != "abc-1" {
		t.Fatalf("expected abc-1, got %q", got)
	}
	if got := pickDocumentID(json.RawMessage(`7788`)); got != "7788" {
		t.Fatalf("expected 7788, got %q", got)
	}
}

func TestPlatformEnvelopeFailError(t *testing.T) {
	err := (PlatformAPIEnvelope{Success: false, ErrorMessage: "分类不存在"}).FailError("fallback")
	if err == nil || err.Error() != "分类不存在" {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := (PlatformAPIEnvelope{Success: true}).FailError("fallback"); err != nil {
		t.Fatalf("success should be nil: %v", err)
	}
}
