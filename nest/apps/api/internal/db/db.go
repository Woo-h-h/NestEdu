package db

import (
	"fmt"
	"time"

	"github.com/your-org/mvp-template/apps/api/internal/config"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(cfg config.DBConfig) (*gorm.DB, error) {
	gormCfg := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	}

	switch cfg.Driver {
	case "postgres", "postgresql":
		return gorm.Open(postgres.Open(cfg.DSN), gormCfg)
	case "mysql":
		return gorm.Open(mysql.Open(cfg.DSN), gormCfg)
	case "sqlite", "sqlite3":
		return gorm.Open(sqlite.Open(cfg.DSN), gormCfg)
	default:
		return nil, fmt.Errorf("unsupported DB_DRIVER: %s", cfg.Driver)
	}
}

func ConfigurePool(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	return nil
}
