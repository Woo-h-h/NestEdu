package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadEnvFilesLaterFileOverridesEarlier(t *testing.T) {
	t.Setenv("PROTECTED_KEY", "from-os")

	dir := t.TempDir()
	rootEnv := filepath.Join(dir, ".env")
	appEnv := filepath.Join(dir, "apps", "api", ".env")
	if err := os.MkdirAll(filepath.Dir(appEnv), 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}

	if err := os.WriteFile(rootEnv, []byte("SHARED_KEY=root\nPROTECTED_KEY=root\n"), 0o644); err != nil {
		t.Fatalf("write root env: %v", err)
	}
	if err := os.WriteFile(appEnv, []byte("SHARED_KEY=app\nAPP_ONLY=app\n"), 0o644); err != nil {
		t.Fatalf("write app env: %v", err)
	}

	LoadEnvFiles(rootEnv, appEnv)

	if got := os.Getenv("SHARED_KEY"); got != "app" {
		t.Fatalf("expected SHARED_KEY=app, got %q", got)
	}
	if got := os.Getenv("APP_ONLY"); got != "app" {
		t.Fatalf("expected APP_ONLY=app, got %q", got)
	}
	if got := os.Getenv("PROTECTED_KEY"); got != "from-os" {
		t.Fatalf("expected PROTECTED_KEY=from-os, got %q", got)
	}
}

func TestNormalizeWebBasePath(t *testing.T) {
	cases := map[string]string{
		"":        "",
		"/":       "",
		"myapp":   "/myapp",
		"/myapp":  "/myapp",
		"/myapp/": "/myapp",
	}

	for input, want := range cases {
		if got := NormalizeWebBasePath(input); got != want {
			t.Fatalf("NormalizeWebBasePath(%q) = %q, want %q", input, got, want)
		}
	}
}
