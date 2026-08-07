package store

import (
	"context"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// ProfileActionStore 用 GORM 访问 profile_action_bundles。
type ProfileActionStore struct {
	db *gorm.DB
}

func NewProfileActionStore(db *gorm.DB) *ProfileActionStore {
	return &ProfileActionStore{db: db}
}

func (s *ProfileActionStore) GetByOwner(ctx context.Context, ownerID string) (model.ProfileActionBundle, error) {
	var row model.ProfileActionBundle
	err := s.db.WithContext(ctx).
		Where("owner_id = ?", strings.TrimSpace(ownerID)).
		First(&row).Error
	if err != nil {
		return model.ProfileActionBundle{}, err
	}
	return row, nil
}

func (s *ProfileActionStore) Upsert(ctx context.Context, row model.ProfileActionBundle) (model.ProfileActionBundle, error) {
	row.OwnerID = strings.TrimSpace(row.OwnerID)
	err := s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "owner_id"}},
		DoUpdates: clause.AssignmentColumns([]string{"states", "updated_at"}),
	}).Create(&row).Error
	if err != nil {
		return model.ProfileActionBundle{}, err
	}
	return s.GetByOwner(ctx, row.OwnerID)
}
