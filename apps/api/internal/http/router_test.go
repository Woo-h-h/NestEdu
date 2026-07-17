package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func newTestRouter(t *testing.T) *httptest.Server {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(store.DomainModels()...); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	return httptest.NewServer(NewRouter(RouterConfig{DB: db}))
}

func TestSampleRoutesCreateAndListItems(t *testing.T) {
	server := newTestRouter(t)
	defer server.Close()

	createResp, err := http.Post(
		server.URL+"/api/v1/sample/items",
		"application/json",
		strings.NewReader(`{"name":"Alpha","description":"First item"}`),
	)
	if err != nil {
		t.Fatalf("post sample item: %v", err)
	}
	defer createResp.Body.Close()
	if createResp.StatusCode != http.StatusOK {
		t.Fatalf("expected create status 200, got %d", createResp.StatusCode)
	}

	listResp, err := http.Get(server.URL + "/api/v1/sample/items?page=1&limit=20")
	if err != nil {
		t.Fatalf("list sample items: %v", err)
	}
	defer listResp.Body.Close()
	if listResp.StatusCode != http.StatusOK {
		t.Fatalf("expected list status 200, got %d", listResp.StatusCode)
	}

	var body struct {
		Success bool `json:"success"`
		Result  []struct {
			Name string `json:"name"`
		} `json:"result"`
		Total int `json:"total"`
	}
	if err := json.NewDecoder(listResp.Body).Decode(&body); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if !body.Success || body.Total != 1 || len(body.Result) != 1 || body.Result[0].Name != "Alpha" {
		t.Fatalf("unexpected list response: %+v", body)
	}
}

func TestSampleRoutesUpdateAndDeleteItem(t *testing.T) {
	server := newTestRouter(t)
	defer server.Close()

	createResp, err := http.Post(
		server.URL+"/api/v1/sample/items",
		"application/json",
		strings.NewReader(`{"name":"Alpha","description":"First item"}`),
	)
	if err != nil {
		t.Fatalf("post sample item: %v", err)
	}
	defer createResp.Body.Close()

	var createBody struct {
		Success bool `json:"success"`
		Result  struct {
			ID uint `json:"id"`
		} `json:"result"`
	}
	if err := json.NewDecoder(createResp.Body).Decode(&createBody); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if !createBody.Success || createBody.Result.ID == 0 {
		t.Fatalf("unexpected create response: %+v", createBody)
	}

	updateReq, err := http.NewRequest(
		http.MethodPut,
		server.URL+"/api/v1/sample/items/"+strconv.FormatUint(uint64(createBody.Result.ID), 10),
		strings.NewReader(`{"name":"Beta","description":"Updated item"}`),
	)
	if err != nil {
		t.Fatalf("build update request: %v", err)
	}
	updateReq.Header.Set("Content-Type", "application/json")

	updateResp, err := http.DefaultClient.Do(updateReq)
	if err != nil {
		t.Fatalf("update sample item: %v", err)
	}
	defer updateResp.Body.Close()
	if updateResp.StatusCode != http.StatusOK {
		t.Fatalf("expected update status 200, got %d", updateResp.StatusCode)
	}

	var updateBody struct {
		Success bool `json:"success"`
		Result  struct {
			Name string `json:"name"`
		} `json:"result"`
	}
	if err := json.NewDecoder(updateResp.Body).Decode(&updateBody); err != nil {
		t.Fatalf("decode update response: %v", err)
	}
	if !updateBody.Success || updateBody.Result.Name != "Beta" {
		t.Fatalf("unexpected update response: %+v", updateBody)
	}

	deleteReq, err := http.NewRequest(
		http.MethodDelete,
		server.URL+"/api/v1/sample/items/"+strconv.FormatUint(uint64(createBody.Result.ID), 10),
		nil,
	)
	if err != nil {
		t.Fatalf("build delete request: %v", err)
	}

	deleteResp, err := http.DefaultClient.Do(deleteReq)
	if err != nil {
		t.Fatalf("delete sample item: %v", err)
	}
	defer deleteResp.Body.Close()
	if deleteResp.StatusCode != http.StatusOK {
		t.Fatalf("expected delete status 200, got %d", deleteResp.StatusCode)
	}

	listResp, err := http.Get(server.URL + "/api/v1/sample/items?page=1&limit=20")
	if err != nil {
		t.Fatalf("list sample items: %v", err)
	}
	defer listResp.Body.Close()

	var listBody struct {
		Success bool `json:"success"`
		Total   int  `json:"total"`
	}
	if err := json.NewDecoder(listResp.Body).Decode(&listBody); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if !listBody.Success || listBody.Total != 0 {
		t.Fatalf("expected empty list after delete, got %+v", listBody)
	}
}
