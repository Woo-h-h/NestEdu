package store

import (
	"context"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

// WeeklyPlanStore 用 GORM 访问 weekly_plans 表。
type WeeklyPlanStore struct {
	db *gorm.DB
}

func NewWeeklyPlanStore(db *gorm.DB) *WeeklyPlanStore {
	return &WeeklyPlanStore{db: db}
}

func (s *WeeklyPlanStore) ListByOwner(ctx context.Context, ownerID string) ([]model.WeeklyPlan, error) {
	var plans []model.WeeklyPlan
	err := s.db.WithContext(ctx).
		Where("owner_id = ?", ownerID).
		Order("created_at DESC").
		Find(&plans).Error
	if err != nil {
		return nil, err
	}
	return plans, nil
}

func (s *WeeklyPlanStore) GetByID(ctx context.Context, ownerID string, id string) (model.WeeklyPlan, error) {
	var plan model.WeeklyPlan
	err := s.db.WithContext(ctx).
		Where("owner_id = ? AND id = ?", ownerID, id).
		First(&plan).Error
	if err != nil {
		return model.WeeklyPlan{}, err
	}
	return plan, nil
}

func (s *WeeklyPlanStore) Create(ctx context.Context, plan model.WeeklyPlan) (model.WeeklyPlan, error) {
	if err := s.db.WithContext(ctx).Create(&plan).Error; err != nil {
		return model.WeeklyPlan{}, err
	}
	return plan, nil
}

func (s *WeeklyPlanStore) Update(ctx context.Context, ownerID string, plan model.WeeklyPlan) (model.WeeklyPlan, error) {
	var existing model.WeeklyPlan
	if err := s.db.WithContext(ctx).
		Where("owner_id = ? AND id = ?", ownerID, plan.ID).
		First(&existing).Error; err != nil {
		return model.WeeklyPlan{}, err
	}

	existing.ThemeName = plan.ThemeName
	existing.ClassName = plan.ClassName
	existing.WeekNumber = plan.WeekNumber
	existing.WeeklyFocus = plan.WeeklyFocus
	existing.DailyPlans = plan.DailyPlans
	existing.Suggestions = plan.Suggestions
	existing.Status = plan.Status

	if err := s.db.WithContext(ctx).Save(&existing).Error; err != nil {
		return model.WeeklyPlan{}, err
	}
	return existing, nil
}

func (s *WeeklyPlanStore) Delete(ctx context.Context, ownerID string, id string) error {
	result := s.db.WithContext(ctx).
		Where("owner_id = ? AND id = ?", ownerID, id).
		Delete(&model.WeeklyPlan{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
