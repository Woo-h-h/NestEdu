package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/store"
	"gorm.io/gorm"
)

var (
	ErrGrowthNotFound         = errors.New("growth record not found")
	ErrGrowthIDRequired       = errors.New("growth record id is required")
	ErrGrowthNameRequired     = errors.New("growth record name is required")
	ErrGrowthCategoryRequired = errors.New("growth record category is required")
)

type GrowthRepository interface {
	ListByOwner(ctx context.Context, ownerID string, filter store.GrowthListFilter) ([]model.GrowthRecord, error)
	GetByID(ctx context.Context, ownerID string, id string) (model.GrowthRecord, error)
	Create(ctx context.Context, record model.GrowthRecord) (model.GrowthRecord, error)
	Update(ctx context.Context, ownerID string, record model.GrowthRecord) (model.GrowthRecord, error)
	Delete(ctx context.Context, ownerID string, id string) error
}

type GrowthService struct {
	repo GrowthRepository
}

func NewGrowthService(repo GrowthRepository) *GrowthService {
	return &GrowthService{repo: repo}
}

func (s *GrowthService) ListRecords(ctx context.Context, ownerID string, filter store.GrowthListFilter) ([]model.GrowthRecordPayload, error) {
	records, err := s.repo.ListByOwner(ctx, ownerID, filter)
	if err != nil {
		return nil, err
	}

	result := make([]model.GrowthRecordPayload, 0, len(records))
	for _, record := range records {
		payload, convErr := toGrowthRecordPayload(record)
		if convErr != nil {
			return nil, convErr
		}
		result = append(result, payload)
	}
	return result, nil
}

func (s *GrowthService) GetRecord(ctx context.Context, ownerID string, id string) (model.GrowthRecordPayload, error) {
	record, err := s.repo.GetByID(ctx, ownerID, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.GrowthRecordPayload{}, ErrGrowthNotFound
		}
		return model.GrowthRecordPayload{}, err
	}
	return toGrowthRecordPayload(record)
}

func (s *GrowthService) SaveRecord(ctx context.Context, ownerID string, payload model.GrowthRecordPayload) (model.GrowthRecordPayload, error) {
	if strings.TrimSpace(payload.ID) == "" {
		return model.GrowthRecordPayload{}, ErrGrowthIDRequired
	}
	if strings.TrimSpace(payload.Name) == "" {
		return model.GrowthRecordPayload{}, ErrGrowthNameRequired
	}
	if strings.TrimSpace(payload.Category) == "" {
		return model.GrowthRecordPayload{}, ErrGrowthCategoryRequired
	}

	record, err := fromGrowthRecordPayload(ownerID, payload)
	if err != nil {
		return model.GrowthRecordPayload{}, err
	}

	_, getErr := s.repo.GetByID(ctx, ownerID, record.ID)
	if getErr != nil {
		if errors.Is(getErr, gorm.ErrRecordNotFound) {
			created, createErr := s.repo.Create(ctx, record)
			if createErr != nil {
				return model.GrowthRecordPayload{}, createErr
			}
			return toGrowthRecordPayload(created)
		}
		return model.GrowthRecordPayload{}, getErr
	}

	updated, updateErr := s.repo.Update(ctx, ownerID, record)
	if updateErr != nil {
		if errors.Is(updateErr, gorm.ErrRecordNotFound) {
			return model.GrowthRecordPayload{}, ErrGrowthNotFound
		}
		return model.GrowthRecordPayload{}, updateErr
	}
	return toGrowthRecordPayload(updated)
}

func (s *GrowthService) DeleteRecord(ctx context.Context, ownerID string, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrGrowthIDRequired
	}
	err := s.repo.Delete(ctx, ownerID, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrGrowthNotFound
		}
		return err
	}
	return nil
}

func toGrowthRecordPayload(record model.GrowthRecord) (model.GrowthRecordPayload, error) {
	keywords := []string{}
	if strings.TrimSpace(record.Keywords) != "" {
		if err := json.Unmarshal([]byte(record.Keywords), &keywords); err != nil {
			return model.GrowthRecordPayload{}, fmt.Errorf("decode keywords: %w", err)
		}
	}

	files := []model.FileMeta{}
	if strings.TrimSpace(record.Files) != "" {
		if err := json.Unmarshal([]byte(record.Files), &files); err != nil {
			return model.GrowthRecordPayload{}, fmt.Errorf("decode files: %w", err)
		}
	}

	extra := map[string]any{}
	if strings.TrimSpace(record.Extra) != "" {
		if err := json.Unmarshal([]byte(record.Extra), &extra); err != nil {
			return model.GrowthRecordPayload{}, fmt.Errorf("decode extra: %w", err)
		}
	}

	return model.GrowthRecordPayload{
		ID:             record.ID,
		Name:           record.Name,
		Year:           record.Year,
		Category:       record.Category,
		Subtype:        record.Subtype,
		Date:           record.Date,
		Level:          record.Level,
		Role:           record.Role,
		Org:            record.Org,
		Intro:          record.Intro,
		Keywords:       keywords,
		Status:         record.Status,
		Representative: record.Representative,
		Extra:          extra,
		Files:          files,
		CreatedAt:      formatGrowthTime(record.CreatedAt),
		UpdatedAt:      formatGrowthTime(record.UpdatedAt),
	}, nil
}

func fromGrowthRecordPayload(ownerID string, payload model.GrowthRecordPayload) (model.GrowthRecord, error) {
	keywordsJSON, err := json.Marshal(payload.Keywords)
	if err != nil {
		return model.GrowthRecord{}, fmt.Errorf("encode keywords: %w", err)
	}

	files := payload.Files
	if files == nil {
		files = []model.FileMeta{}
	}
	filesJSON, err := json.Marshal(files)
	if err != nil {
		return model.GrowthRecord{}, fmt.Errorf("encode files: %w", err)
	}

	extra := payload.Extra
	if extra == nil {
		extra = map[string]any{}
	}
	extraJSON, err := json.Marshal(extra)
	if err != nil {
		return model.GrowthRecord{}, fmt.Errorf("encode extra: %w", err)
	}

	status := strings.TrimSpace(payload.Status)
	if status == "" {
		status = "已完成"
	}

	year := payload.Year
	if year == 0 {
		year = time.Now().Year()
	}

	return model.GrowthRecord{
		ID:             strings.TrimSpace(payload.ID),
		OwnerID:        ownerID,
		Name:           strings.TrimSpace(payload.Name),
		Year:           year,
		Category:       strings.TrimSpace(payload.Category),
		Subtype:        strings.TrimSpace(payload.Subtype),
		Date:           strings.TrimSpace(payload.Date),
		Level:          strings.TrimSpace(payload.Level),
		Role:           strings.TrimSpace(payload.Role),
		Org:            strings.TrimSpace(payload.Org),
		Intro:          payload.Intro,
		Keywords:       string(keywordsJSON),
		Status:         status,
		Representative: payload.Representative,
		Extra:          string(extraJSON),
		Files:          string(filesJSON),
	}, nil
}

func formatGrowthTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
