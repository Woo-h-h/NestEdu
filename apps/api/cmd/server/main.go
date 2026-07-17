package main

import (
	"log"

	"github.com/your-org/mvp-template/apps/api/internal/config"
	backendDB "github.com/your-org/mvp-template/apps/api/internal/db"
	apihttp "github.com/your-org/mvp-template/apps/api/internal/http"
	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/service"
	"github.com/your-org/mvp-template/apps/api/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}

	model.SampleItemTableName = cfg.Sample.TableName
	model.WeeklyPlanTableName = cfg.WeeklyPlan.TableName

	db, err := backendDB.Open(cfg.DB)
	if err != nil {
		log.Fatalf("open db failed: %v", err)
	}
	if err := backendDB.ConfigurePool(db); err != nil {
		log.Fatalf("configure db pool failed: %v", err)
	}

	if cfg.DB.AutoMigrate {
		if err := db.AutoMigrate(store.DomainModels()...); err != nil {
			log.Fatalf("auto migrate failed: %v", err)
		}
	}

	r := apihttp.NewRouter(apihttp.RouterConfig{
		DB:           db,
		WebStaticDir: cfg.WebStaticDir,
		WebBasePath:  cfg.WebBasePath,
		LLM: service.LLMConfig{
			APIKey:  cfg.LLM.APIKey,
			BaseURL: cfg.LLM.BaseURL,
			Model:   cfg.LLM.Model,
		},
		Platform: service.PlatformClientConfig{
			BaseURL: cfg.Platform.BaseURL,
			Referer: cfg.Platform.Referer,
			MVP:     cfg.Platform.MVP,
		},
		Knowledge: service.KnowledgeConfig{
			ListPath:   cfg.Platform.KnowledgeListPath,
			DetailPath: cfg.Platform.KnowledgeDetailPath,
			UploadPath: cfg.Platform.KnowledgeUploadPath,
			DeletePath: cfg.Platform.KnowledgeDeletePath,
			DefaultID:  cfg.Platform.DefaultKnowledgeID,
		},
	})

	log.Printf("mvp template backend server listening on %s", cfg.ServerAddr)
	if err := r.Run(cfg.ServerAddr); err != nil {
		log.Fatalf("server run failed: %v", err)
	}
}
