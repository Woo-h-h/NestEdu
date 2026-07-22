package store

import (
	"context"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

type GrowthListFilter struct {
	Year     *int
	Category string
	Level    string
	Status   string
	Keyword  string
}

type GrowthStore struct {
	db *gorm.DB
}

func NewGrowthStore(db *gorm.DB) *GrowthStore {
	return &GrowthStore{db: db}
}

func (s *GrowthStore) ListByOwner(ctx context.Context, ownerID string, filter GrowthListFilter) ([]model.GrowthRecord, error) {
	query := s.db.WithContext(ctx).Where("owner_id = ?", ownerID)
	if filter.Year != nil {
		query = query.Where("year = ?", *filter.Year)
	}
	if category := strings.TrimSpace(filter.Category); category != "" {
		query = query.Where("category = ?", category)
	}
	if level := strings.TrimSpace(filter.Level); level != "" {
		query = query.Where("level = ?", level)
	}
	if status := strings.TrimSpace(filter.Status); status != "" {
		query = query.Where("status = ?", status)
	}
	if keyword := strings.TrimSpace(filter.Keyword); keyword != "" {
		like := "%" + keyword + "%"
		query = query.Where("name LIKE ? OR intro LIKE ? OR org LIKE ?", like, like, like)
	}

	var records []model.GrowthRecord
	err := query.Order("date DESC, created_at DESC").Find(&records).Error
	if err != nil {
		return nil, err
	}
	return records, nil
}

func (s *GrowthStore) GetByID(ctx context.Context, ownerID string, id string) (model.GrowthRecord, error) {
	var record model.GrowthRecord
	err := s.db.WithContext(ctx).
		Where("owner_id = ? AND id = ?", ownerID, id).
		First(&record).Error
	if err != nil {
		return model.GrowthRecord{}, err
	}
	return record, nil
}

func (s *GrowthStore) Create(ctx context.Context, record model.GrowthRecord) (model.GrowthRecord, error) {
	if err := s.db.WithContext(ctx).Create(&record).Error; err != nil {
		return model.GrowthRecord{}, err
	}
	return record, nil
}

func (s *GrowthStore) Update(ctx context.Context, ownerID string, record model.GrowthRecord) (model.GrowthRecord, error) {
	var existing model.GrowthRecord
	if err := s.db.WithContext(ctx).
		Where("owner_id = ? AND id = ?", ownerID, record.ID).
		First(&existing).Error; err != nil {
		return model.GrowthRecord{}, err
	}

	existing.Name = record.Name
	existing.Year = record.Year
	existing.Category = record.Category
	existing.Subtype = record.Subtype
	existing.Date = record.Date
	existing.Level = record.Level
	existing.Role = record.Role
	existing.Org = record.Org
	existing.Intro = record.Intro
	existing.Keywords = record.Keywords
	existing.Status = record.Status
	existing.Representative = record.Representative
	existing.Extra = record.Extra
	existing.Files = record.Files

	if err := s.db.WithContext(ctx).Save(&existing).Error; err != nil {
		return model.GrowthRecord{}, err
	}
	return existing, nil
}

func (s *GrowthStore) Delete(ctx context.Context, ownerID string, id string) error {
	result := s.db.WithContext(ctx).
		Where("owner_id = ? AND id = ?", ownerID, id).
		Delete(&model.GrowthRecord{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
