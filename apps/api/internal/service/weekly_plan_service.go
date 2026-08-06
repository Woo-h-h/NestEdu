package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

var (
	ErrWeeklyPlanNotFound    = errors.New("weekly plan not found")
	ErrWeeklyPlanIDRequired  = errors.New("weekly plan id is required")
	ErrWeeklyPlanThemeRequired = errors.New("theme name is required")
)

type WeeklyPlanRepository interface {
	ListByOwner(ctx context.Context, ownerID string) ([]model.WeeklyPlan, error)
	GetByID(ctx context.Context, ownerID string, id string) (model.WeeklyPlan, error)
	Create(ctx context.Context, plan model.WeeklyPlan) (model.WeeklyPlan, error)
	Update(ctx context.Context, ownerID string, plan model.WeeklyPlan) (model.WeeklyPlan, error)
	Delete(ctx context.Context, ownerID string, id string) error
}

// WeeklyPlanService 本地周计划 CRUD 编排（校验 + store）。
type WeeklyPlanService struct {
	repo WeeklyPlanRepository
}

func NewWeeklyPlanService(repo WeeklyPlanRepository) *WeeklyPlanService {
	return &WeeklyPlanService{repo: repo}
}

func (s *WeeklyPlanService) ListPlans(ctx context.Context, ownerID string) ([]model.WeeklyPlanPayload, error) {
	plans, err := s.repo.ListByOwner(ctx, ownerID)
	if err != nil {
		return nil, err
	}

	result := make([]model.WeeklyPlanPayload, 0, len(plans))
	for _, plan := range plans {
		payload, convErr := toWeeklyPlanPayload(plan)
		if convErr != nil {
			return nil, convErr
		}
		result = append(result, payload)
	}
	return result, nil
}

func (s *WeeklyPlanService) GetPlan(ctx context.Context, ownerID string, id string) (model.WeeklyPlanPayload, error) {
	plan, err := s.repo.GetByID(ctx, ownerID, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.WeeklyPlanPayload{}, ErrWeeklyPlanNotFound
		}
		return model.WeeklyPlanPayload{}, err
	}
	return toWeeklyPlanPayload(plan)
}

func (s *WeeklyPlanService) SavePlan(ctx context.Context, ownerID string, payload model.WeeklyPlanPayload) (model.WeeklyPlanPayload, error) {
	if strings.TrimSpace(payload.ID) == "" {
		return model.WeeklyPlanPayload{}, ErrWeeklyPlanIDRequired
	}
	if strings.TrimSpace(payload.ThemeName) == "" {
		return model.WeeklyPlanPayload{}, ErrWeeklyPlanThemeRequired
	}

	plan, err := fromWeeklyPlanPayload(ownerID, payload)
	if err != nil {
		return model.WeeklyPlanPayload{}, err
	}

	existing, getErr := s.repo.GetByID(ctx, ownerID, plan.ID)
	if getErr != nil {
		if errors.Is(getErr, gorm.ErrRecordNotFound) {
			created, createErr := s.repo.Create(ctx, plan)
			if createErr != nil {
				return model.WeeklyPlanPayload{}, createErr
			}
			return toWeeklyPlanPayload(created)
		}
		return model.WeeklyPlanPayload{}, getErr
	}

	_ = existing
	updated, updateErr := s.repo.Update(ctx, ownerID, plan)
	if updateErr != nil {
		if errors.Is(updateErr, gorm.ErrRecordNotFound) {
			return model.WeeklyPlanPayload{}, ErrWeeklyPlanNotFound
		}
		return model.WeeklyPlanPayload{}, updateErr
	}
	return toWeeklyPlanPayload(updated)
}

func (s *WeeklyPlanService) DeletePlan(ctx context.Context, ownerID string, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrWeeklyPlanIDRequired
	}
	err := s.repo.Delete(ctx, ownerID, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrWeeklyPlanNotFound
		}
		return err
	}
	return nil
}

func toWeeklyPlanPayload(plan model.WeeklyPlan) (model.WeeklyPlanPayload, error) {
	var dailyPlans []model.DayPlan
	if err := json.Unmarshal([]byte(plan.DailyPlans), &dailyPlans); err != nil {
		return model.WeeklyPlanPayload{}, fmt.Errorf("decode daily plans: %w", err)
	}

	createdAt := plan.CreatedAt.UTC().Format(time.RFC3339)
	if !plan.CreatedAt.IsZero() {
		createdAt = plan.CreatedAt.UTC().Format(time.RFC3339)
	}

	return model.WeeklyPlanPayload{
		ID:          plan.ID,
		ThemeName:   plan.ThemeName,
		ClassName:   plan.ClassName,
		WeekNumber:  plan.WeekNumber,
		WeeklyFocus: plan.WeeklyFocus,
		DailyPlans:  dailyPlans,
		Suggestions: plan.Suggestions,
		CreatedAt:   createdAt,
		Status:      plan.Status,
	}, nil
}

func fromWeeklyPlanPayload(ownerID string, payload model.WeeklyPlanPayload) (model.WeeklyPlan, error) {
	dailyJSON, err := json.Marshal(payload.DailyPlans)
	if err != nil {
		return model.WeeklyPlan{}, fmt.Errorf("encode daily plans: %w", err)
	}

	status := strings.TrimSpace(payload.Status)
	if status == "" {
		status = "saved"
	}

	return model.WeeklyPlan{
		ID:          strings.TrimSpace(payload.ID),
		OwnerID:     ownerID,
		ThemeName:   strings.TrimSpace(payload.ThemeName),
		ClassName:   strings.TrimSpace(payload.ClassName),
		WeekNumber:  payload.WeekNumber,
		WeeklyFocus: payload.WeeklyFocus,
		DailyPlans:  string(dailyJSON),
		Suggestions: payload.Suggestions,
		Status:      status,
	}, nil
}
