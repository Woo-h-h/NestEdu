package http

import (
	"net/http"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestSecuredRoutesRequireAuth(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(store.DomainModels()...); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	server := newTestRouterWithDB(t, db)
	defer server.Close()

	resp, err := http.Get(server.URL + "/api/v1/growth-records")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 without auth, got %d", resp.StatusCode)
	}

	req, err := http.NewRequest(http.MethodGet, server.URL+"/api/v1/growth-records", nil)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("Authorization", "Bearer test-token")
	// 有 Token 但无 X-Uid*
	resp2, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("do: %v", err)
	}
	defer resp2.Body.Close()
	if resp2.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401 without owner header, got %d", resp2.StatusCode)
	}
}

func TestCORSAllowlist(t *testing.T) {
	allowed := parseOriginAllowlist("http://localhost:3005,https://nest.zcat.cn")
	if !originAllowed("http://localhost:3005", allowed) {
		t.Fatal("localhost should be allowed")
	}
	if originAllowed("https://evil.example", allowed) {
		t.Fatal("evil origin must be rejected")
	}
	if originAllowed("https://evil.example", parseOriginAllowlist("")) {
		t.Fatal("empty allowlist must reject cross-origin")
	}
}

func TestSampleStillOpenWithoutAuth(t *testing.T) {
	server := newTestRouter(t)
	defer server.Close()
	resp, err := http.Get(server.URL + "/api/v1/sample/items?page=1&limit=5")
	if err != nil {
		t.Fatalf("get sample: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("sample should remain open, got %d", resp.StatusCode)
	}
}

func TestHealthzOpen(t *testing.T) {
	server := newTestRouter(t)
	defer server.Close()
	resp, err := http.Get(server.URL + "/healthz")
	if err != nil {
		t.Fatalf("healthz: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}
