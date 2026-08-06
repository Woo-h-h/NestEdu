package store

import (
	"context"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

// SampleStore 用 GORM 访问 sample_items（模板样例表）。
type SampleStore struct {
	db *gorm.DB
}

func NewSampleStore(db *gorm.DB) *SampleStore {
	return &SampleStore{db: db}
}

func (s *SampleStore) ListItems(ctx context.Context, page int, limit int) ([]model.SampleItem, int64, error) {
	var total int64
	if err := s.db.WithContext(ctx).Model(&model.SampleItem{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []model.SampleItem
	err := s.db.WithContext(ctx).
		Order("created_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&items).Error
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func (s *SampleStore) CreateItem(ctx context.Context, item model.SampleItem) (model.SampleItem, error) {
	if err := s.db.WithContext(ctx).Create(&item).Error; err != nil {
		return model.SampleItem{}, err
	}
	return item, nil
}

func (s *SampleStore) UpdateItem(ctx context.Context, id uint, item model.SampleItem) (model.SampleItem, error) {
	var existing model.SampleItem
	if err := s.db.WithContext(ctx).First(&existing, id).Error; err != nil {
		return model.SampleItem{}, err
	}

	existing.Name = item.Name
	existing.Description = item.Description
	if err := s.db.WithContext(ctx).Save(&existing).Error; err != nil {
		return model.SampleItem{}, err
	}
	return existing, nil
}

func (s *SampleStore) DeleteItem(ctx context.Context, id uint) error {
	result := s.db.WithContext(ctx).Delete(&model.SampleItem{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
