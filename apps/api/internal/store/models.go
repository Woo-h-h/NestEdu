package store

import "github.com/your-org/mvp-template/apps/api/internal/model"

func DomainModels() []any {
	return []any{
		&model.SampleItem{},
		&model.WeeklyPlan{},
		&model.GrowthRecord{},
	}
}
