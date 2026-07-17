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

	llmService := service.NewLLMService(cfg.LLM)
	aiHandler := newAIHandler(llmService)

	platformClient := service.NewPlatformClient(cfg.Platform)
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

	registerWebStatic(r, cfg.WebStaticDir, cfg.WebBasePath)

	return r
}
