package store

import (
	"context"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ArchiveAchievementStore struct {
	db *gorm.DB
}

func NewArchiveAchievementStore(db *gorm.DB) *ArchiveAchievementStore {
	return &ArchiveAchievementStore{db: db}
}

func (s *ArchiveAchievementStore) Upsert(ctx context.Context, row model.ArchiveAchievement) (model.ArchiveAchievement, error) {
	err := s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "knowledge_doc_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"phone", "owner_id", "title", "tree_category", "year", "material_type",
			"summary", "needs_human_review", "knowledge_id", "category_id", "updated_at",
		}),
	}).Create(&row).Error
	if err != nil {
		return model.ArchiveAchievement{}, err
	}
	var saved model.ArchiveAchievement
	if err := s.db.WithContext(ctx).
		Where("knowledge_doc_id = ?", row.KnowledgeDocID).
		First(&saved).Error; err != nil {
		return model.ArchiveAchievement{}, err
	}
	return saved, nil
}

func (s *ArchiveAchievementStore) ListByPhoneAndOwner(
	ctx context.Context,
	phone, ownerID string,
	limit, offset int,
) ([]model.ArchiveAchievement, error) {
	q := s.db.WithContext(ctx).Where(
		"phone = ? AND (owner_id = ? OR owner_id = ? OR owner_id = ?)",
		strings.TrimSpace(phone), strings.TrimSpace(ownerID), "anonymous", "",
	)
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	var rows []model.ArchiveAchievement
	if err := q.Order("year DESC, created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *ArchiveAchievementStore) DeleteByKnowledgeDocIDAndOwner(ctx context.Context, knowledgeDocID, ownerID string) error {
	res := s.db.WithContext(ctx).
		Where("knowledge_doc_id = ? AND (owner_id = ? OR owner_id = ? OR owner_id = ?)",
			strings.TrimSpace(knowledgeDocID), strings.TrimSpace(ownerID), "anonymous", "").
		Delete(&model.ArchiveAchievement{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
