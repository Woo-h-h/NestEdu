package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newWeeklyPlanTestRouter(t *testing.T) *httptest.Server {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(store.DomainModels()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	return newTestRouterWithDB(t, db)
}

func TestWeeklyPlanRoutesCreateListDelete(t *testing.T) {
	server := newWeeklyPlanTestRouter(t)
	defer server.Close()

	createResp, err := http.Post(
		server.URL+"/api/v1/weekly-plans",
		"application/json",
		strings.NewReader(`{
			"id":"plan_test_1",
			"themeName":"亲亲自然",
			"className":"小班",
			"weekNumber":3,
			"weeklyFocus":"周重点",
			"dailyPlans":[
				{"day":"周一","collectiveLearning":"a","regionalGames":"b","dailyLife":"c","outdoorSports":"d"},
				{"day":"周二","collectiveLearning":"a","regionalGames":"b","dailyLife":"c","outdoorSports":"d"},
				{"day":"周三","collectiveLearning":"a","regionalGames":"b","dailyLife":"c","outdoorSports":"d"},
				{"day":"周四","collectiveLearning":"a","regionalGames":"b","dailyLife":"c","outdoorSports":"d"},
				{"day":"周五","collectiveLearning":"a","regionalGames":"b","dailyLife":"c","outdoorSports":"d"}
			],
			"suggestions":"建议",
			"status":"saved"
		}`),
	)
	if err != nil {
		t.Fatalf("create weekly plan: %v", err)
	}
	defer createResp.Body.Close()
	if createResp.StatusCode != http.StatusOK {
		t.Fatalf("expected create status 200, got %d", createResp.StatusCode)
	}

	listResp, err := http.Get(server.URL + "/api/v1/weekly-plans")
	if err != nil {
		t.Fatalf("list weekly plans: %v", err)
	}
	defer listResp.Body.Close()
	if listResp.StatusCode != http.StatusOK {
		t.Fatalf("expected list status 200, got %d", listResp.StatusCode)
	}

	var listBody struct {
		Success bool `json:"success"`
		Result  []struct {
			ID string `json:"id"`
		} `json:"result"`
	}
	if err := json.NewDecoder(listResp.Body).Decode(&listBody); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if !listBody.Success || len(listBody.Result) != 1 || listBody.Result[0].ID != "plan_test_1" {
		t.Fatalf("unexpected list response: %+v", listBody)
	}

	deleteReq, err := http.NewRequest(http.MethodDelete, server.URL+"/api/v1/weekly-plans/plan_test_1", nil)
	if err != nil {
		t.Fatalf("build delete request: %v", err)
	}
	deleteResp, err := http.DefaultClient.Do(deleteReq)
	if err != nil {
		t.Fatalf("delete weekly plan: %v", err)
	}
	defer deleteResp.Body.Close()
	if deleteResp.StatusCode != http.StatusOK {
		t.Fatalf("expected delete status 200, got %d", deleteResp.StatusCode)
	}
}

func TestAIWeeklyPlanGenerateRequiresAuth(t *testing.T) {
	server := newWeeklyPlanTestRouter(t)
	defer server.Close()

	resp, err := http.Post(
		server.URL+"/api/v1/ai/weekly-plan/generate",
		"application/json",
		strings.NewReader(`{"themeName":"亲亲自然","className":"小班","weekNumber":2,"fileContents":[]}`),
	)
	if err != nil {
		t.Fatalf("generate weekly plan: %v", err)
	}
	defer resp.Body.Close()
	// 未登录时不得再返回本地 mock，应失败
	if resp.StatusCode == http.StatusOK {
		t.Fatalf("expected generate to fail without auth/agent, got 200 (mock leak?)")
	}
	if resp.StatusCode != http.StatusUnauthorized && resp.StatusCode != http.StatusBadGateway {
		t.Fatalf("expected 401 or 502, got %d", resp.StatusCode)
	}
}
