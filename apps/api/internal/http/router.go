package http

import (
	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/service"
	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/gorm"
)

type RouterConfig struct {
	DB           *gorm.DB
	WebStaticDir string
	WebBasePath  string
	LLM          service.LLMConfig
	Platform     service.PlatformClientConfig
	Knowledge    service.KnowledgeConfig
}

func NewRouter(cfg RouterConfig) *gin.Engine {
	sampleStore := store.NewSampleStore(cfg.DB)
	sampleService := service.NewSampleService(sampleStore)
	sampleHandler := newSampleHandler(sampleService)

	weeklyPlanStore := store.NewWeeklyPlanStore(cfg.DB)
	weeklyPlanService := service.NewWeeklyPlanService(weeklyPlanStore)
	weeklyPlanHandler := newWeeklyPlanHandler(weeklyPlanService)

	platformClient := service.NewPlatformClient(cfg.Platform)
	llmService := service.NewLLMService(cfg.LLM, platformClient)
	aiHandler := newAIHandler(llmService)

	knowledgeService := service.NewKnowledgeService(platformClient, cfg.Knowledge)
	knowledgeHandler := newKnowledgeHandler(knowledgeService)

	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger(), cors())

	r.GET("/healthz", func(c *gin.Context) {
		jsonResult(c, 200, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	sampleHandler.registerRoutes(api)
	weeklyPlanHandler.registerRoutes(api)
	aiHandler.registerRoutes(api)
	knowledgeHandler.registerRoutes(api)

	// 平台知识库 / 智能体：同域反代，避免生产环境落到 NoRoute「api route not found」
	registerPlatformProxy(r, cfg.Platform)

	registerWebStatic(r, cfg.WebStaticDir, cfg.WebBasePath)

	return r
}
