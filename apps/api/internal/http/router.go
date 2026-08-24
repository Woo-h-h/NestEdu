package http

import (
	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/service"
	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/gorm"
)

// RouterConfig 组装路由所需依赖：DB、静态资源目录、LLM / 平台 / 知识库配置。
type RouterConfig struct {
	DB                 *gorm.DB
	WebStaticDir       string
	WebBasePath        string
	CORSAllowedOrigins string
	LLM                service.LLMConfig
	Platform           service.PlatformClientConfig
	Knowledge          service.KnowledgeConfig
}

// NewRouter 创建 Gin 引擎：挂载中间件、/api/v1 业务路由、平台反代与静态资源。
// store → service → handler 在此完成依赖注入。
func NewRouter(cfg RouterConfig) *gin.Engine {
	sampleStore := store.NewSampleStore(cfg.DB)
	sampleService := service.NewSampleService(sampleStore)
	sampleHandler := newSampleHandler(sampleService)

	weeklyPlanStore := store.NewWeeklyPlanStore(cfg.DB)
	weeklyPlanService := service.NewWeeklyPlanService(weeklyPlanStore)
	weeklyPlanHandler := newWeeklyPlanHandler(weeklyPlanService)

	growthStore := store.NewGrowthStore(cfg.DB)
	growthService := service.NewGrowthService(growthStore)
	growthHandler := newGrowthHandler(growthService)

	profileSnapshotStore := store.NewProfileSnapshotStore(cfg.DB)
	profileSnapshotService := service.NewProfileSnapshotService(profileSnapshotStore)
	profileSnapshotHandler := newProfileSnapshotHandler(profileSnapshotService)

	teacherGeneratedDocStore := store.NewTeacherGeneratedDocStore(cfg.DB)
	teacherGeneratedDocService := service.NewTeacherGeneratedDocService(teacherGeneratedDocStore)
	teacherGeneratedDocHandler := newTeacherGeneratedDocHandler(teacherGeneratedDocService)

	archiveAchievementStore := store.NewArchiveAchievementStore(cfg.DB)
	archiveAchievementService := service.NewArchiveAchievementService(archiveAchievementStore)
	archiveAchievementHandler := newArchiveAchievementHandler(archiveAchievementService)

	profileActionStore := store.NewProfileActionStore(cfg.DB)
	profileActionService := service.NewProfileActionService(profileActionStore)
	profileActionHandler := newProfileActionHandler(profileActionService)

	platformClient := service.NewPlatformClient(cfg.Platform)
	llmService := service.NewLLMService(cfg.LLM, platformClient)
	aiHandler := newAIHandler(llmService)

	knowledgeService := service.NewKnowledgeService(platformClient, cfg.Knowledge)
	knowledgeHandler := newKnowledgeHandler(knowledgeService)

	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger(), cors(cfg.CORSAllowedOrigins))

	r.GET("/healthz", func(c *gin.Context) {
		jsonResult(c, 200, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	// 模板样例不强制登录，便于本地冒烟
	sampleHandler.registerRoutes(api)

	secured := api.Group("")
	secured.Use(requireAPISession())
	weeklyPlanHandler.registerRoutes(secured)
	growthHandler.registerRoutes(secured)
	profileSnapshotHandler.registerRoutes(secured)
	teacherGeneratedDocHandler.registerRoutes(secured)
	archiveAchievementHandler.registerRoutes(secured)
	profileActionHandler.registerRoutes(secured)
	aiHandler.registerRoutes(secured)
	knowledgeHandler.registerRoutes(secured)

	// 平台知识库 / 智能体：同域反代，避免生产环境落到 NoRoute「api route not found」
	registerPlatformProxy(r, cfg.Platform)

	registerWebStatic(r, cfg.WebStaticDir, cfg.WebBasePath)

	return r
}
