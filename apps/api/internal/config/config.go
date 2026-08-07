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

type WeeklyPlanConfig struct {
	TableName string
}

type LLMConfig struct {
	APIKey          string
	BaseURL         string
	Model           string
	WeeklyAgentID   int
	TeachingAgentID int
}

type PlatformConfig struct {
	BaseURL             string
	Referer             string
	MVP                 string
	KnowledgeListPath   string
	KnowledgeDetailPath string
	KnowledgeUploadPath string
	KnowledgeDeletePath string
	DefaultKnowledgeID  string
	ActivityCategoryID  string
	ActivityCategoryKey string
	WeeklyCategoryID    string
	WeeklyCategoryKey   string
}

type Config struct {
	ServerAddr         string
	CORSAllowedOrigins string
	DB                 DBConfig
	Sample             SampleConfig
	WeeklyPlan         WeeklyPlanConfig
	LLM                LLMConfig
	Platform           PlatformConfig
	WebStaticDir       string
	WebBasePath        string
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
		ServerAddr:         getEnv("SERVER_ADDR", ":8088"),
		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3005,https://nest.zcat.cn"),
		DB: DBConfig{
			Driver:      strings.ToLower(getEnv("DB_DRIVER", "postgres")),
			DSN:         strings.TrimSpace(os.Getenv("DB_DSN")),
			AutoMigrate: strings.EqualFold(getEnv("DB_AUTO_MIGRATE", "false"), "true"),
		},
		Sample: SampleConfig{
			TableName: getEnv("SAMPLE_TABLE_NAME", "sample_items"),
		},
		WeeklyPlan: WeeklyPlanConfig{
			TableName: getEnv("WEEKLY_PLAN_TABLE_NAME", "weekly_plans"),
		},
		LLM: LLMConfig{
			APIKey:          strings.TrimSpace(os.Getenv("DEEPSEEK_API_KEY")),
			BaseURL:         getEnv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
			Model:           getEnv("DEEPSEEK_MODEL", "deepseek-chat"),
			WeeklyAgentID:   getEnvInt("WEEKLY_PLAN_AGENT_ID", 14332),
			TeachingAgentID: getEnvInt("TEACHING_AGENT_ID", 14317),
		},
		Platform: PlatformConfig{
			BaseURL:             getEnv("PLATFORM_API_BASE_URL", "https://api.zcat.cn"),
			Referer:             getEnv("PLATFORM_REFERER", "https://www.zcat.cn"),
			MVP:                 getEnv("PLATFORM_MVP", "mvp-template"),
			KnowledgeListPath:   getEnv("KNOWLEDGE_LIST_PATH", "/api/knowledge/document/list"),
			KnowledgeDetailPath: getEnv("KNOWLEDGE_DETAIL_PATH", "/api/knowledge/document/detail"),
			KnowledgeUploadPath: getEnv("KNOWLEDGE_UPLOAD_PATH", "/api/knowledge/document/text"),
			KnowledgeDeletePath: getEnv("KNOWLEDGE_DELETE_PATH", "/api/knowledge/document/delete"),
			DefaultKnowledgeID:  getEnv("DEFAULT_KNOWLEDGE_ID", "10298"),
			ActivityCategoryID:  getEnv("DEFAULT_KNOWLEDGE_CATEGORY_ID", "20806"),
			ActivityCategoryKey: getEnv("DEFAULT_KNOWLEDGE_CATEGORY_KEY", "custom_1784259353619"),
			WeeklyCategoryID:    getEnv("WEEKLY_PLAN_KNOWLEDGE_CATEGORY_ID", "20807"),
			WeeklyCategoryKey:   getEnv("WEEKLY_PLAN_KNOWLEDGE_CATEGORY_KEY", "custom_1784275664825"),
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
