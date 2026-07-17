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
}

func NewRouter(cfg RouterConfig) *gin.Engine {
	sampleStore := store.NewSampleStore(cfg.DB)
	sampleService := service.NewSampleService(sampleStore)
	sampleHandler := newSampleHandler(sampleService)

	r := gin.New()
	r.Use(gin.Recovery(), gin.Logger(), cors())

	r.GET("/healthz", func(c *gin.Context) {
		jsonResult(c, 200, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	sampleHandler.registerRoutes(api)

	registerWebStatic(r, cfg.WebStaticDir, cfg.WebBasePath)

	return r
}
