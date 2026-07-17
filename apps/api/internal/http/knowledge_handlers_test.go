package http

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

func newKnowledgeTestRouter(t *testing.T, platformHandler http.HandlerFunc) *httptest.Server {
	t.Helper()

	platformServer := httptest.NewServer(platformHandler)
	t.Cleanup(platformServer.Close)

	platformClient := service.NewPlatformClient(service.PlatformClientConfig{
		BaseURL: platformServer.URL,
		Referer: "https://www.zcat.cn",
		MVP:     "mvp-template",
	})
	knowledgeService := service.NewKnowledgeService(platformClient, service.KnowledgeConfig{
		ListPath:   "/api/knowledge/document/list",
		DetailPath: "/api/knowledge/document/detail",
		DefaultID:  "10298",
	})

	r := ginNewTestEngine()
	api := r.Group("/api/v1")
	newKnowledgeHandler(knowledgeService).registerRoutes(api)
	return httptest.NewServer(r)
}

func ginNewTestEngine() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(gin.Recovery())
	return r
}

func TestKnowledgeListPlansFromPlatform(t *testing.T) {
	server := newKnowledgeTestRouter(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/api/knowledge/document/list" {
			http.NotFound(w, r)
			return
		}

		body, _ := io.ReadAll(r.Body)
		var req map[string]any
		_ = json.Unmarshal(body, &req)
		if req["knowledge_id"] == nil {
			t.Fatalf("expected knowledge_id in body, got %s", string(body))
		}

		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"total":   1,
			"result": []map[string]any{
				{
					"document_id":   501,
					"title":         "亲亲自然",
					"desc":          "认识自然",
					"content":       "教案正文",
					"category_name": "科学",
					"knowledge_id":  10298,
				},
			},
		})
	})
	defer server.Close()

	resp, err := http.Get(server.URL + "/api/v1/knowledge/plans?knowledgeId=10298")
	if err != nil {
		t.Fatalf("get knowledge plans: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var body struct {
		Success bool `json:"success"`
		Result  []struct {
			ID    string `json:"id"`
			Title string `json:"title"`
		} `json:"result"`
		Source string `json:"source"`
		Total  int    `json:"total"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !body.Success || body.Source != "platform" || body.Total != 1 || len(body.Result) != 1 || body.Result[0].ID != "501" {
		t.Fatalf("unexpected response: %+v", body)
	}
}

func TestKnowledgeGetPlanFromPlatform(t *testing.T) {
	server := newKnowledgeTestRouter(t, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet || r.URL.Path != "/api/knowledge/document/detail" {
			http.NotFound(w, r)
			return
		}
		if r.URL.Query().Get("document_id") != "501" {
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"success": true,
			"result": map[string]any{
				"document_id": 501,
				"title":       "亲亲自然",
				"content":     "教案正文",
				"desc":        "认识自然",
			},
		})
	})
	defer server.Close()

	resp, err := http.Get(server.URL + "/api/v1/knowledge/plans/501")
	if err != nil {
		t.Fatalf("get knowledge plan: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	var body struct {
		Success bool `json:"success"`
		Result  struct {
			ID    string `json:"id"`
			Title string `json:"title"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !body.Success || body.Result.ID != "501" || body.Result.Title != "亲亲自然" {
		t.Fatalf("unexpected response: %+v", body)
	}
}
