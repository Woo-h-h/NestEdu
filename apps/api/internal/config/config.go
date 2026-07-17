package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type DBConfig struct {
	Driver      string
	DSN         string
	AutoMigrate bool
}

type SampleConfig struct {
	TableName string
}

type Config struct {
	ServerAddr   string
	DB           DBConfig
	Sample       SampleConfig
	WebStaticDir string
	WebBasePath  string
}

func Load() (Config, error) {
	root := findRepoRoot()
	LoadEnvFiles(
		filepath.Join(root, ".env"),
		filepath.Join(root, "apps/api/.env"),
		filepath.Join(root, ".env.local"),
		filepath.Join(root, "apps/api/.env.local"),
	)

	cfg := Config{
		ServerAddr: getEnv("SERVER_ADDR", ":8088"),
		DB: DBConfig{
			Driver:      strings.ToLower(getEnv("DB_DRIVER", "postgres")),
			DSN:         strings.TrimSpace(os.Getenv("DB_DSN")),
			AutoMigrate: strings.EqualFold(getEnv("DB_AUTO_MIGRATE", "false"), "true"),
		},
		Sample: SampleConfig{
			TableName: getEnv("SAMPLE_TABLE_NAME", "sample_items"),
		},
		WebStaticDir: strings.TrimSpace(os.Getenv("WEB_STATIC_DIR")),
		WebBasePath:  NormalizeWebBasePath(os.Getenv("WEB_BASE_PATH")),
	}

	if cfg.DB.DSN == "" {
		return Config{}, fmt.Errorf("missing required env DB_DSN")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func getEnvInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return n
}
