package store

import "github.com/your-org/mvp-template/apps/api/internal/model"

// DomainModels 返回参与 GORM AutoMigrate 的 MySQL 表实体（不含知识库 DTO）。
func DomainModels() []any {
	return []any{
		&model.SampleItem{},
		&model.WeeklyPlan{},
		&model.GrowthRecord{},
		&model.ProfileSnapshot{},
		&model.TeacherGeneratedDoc{},
	}
}
