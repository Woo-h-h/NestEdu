package store

import (
	"context"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

// ProfileSnapshotStore 用 GORM 访问 profile_snapshots 表。
type ProfileSnapshotStore struct {
	db *gorm.DB
}

func NewProfileSnapshotStore(db *gorm.DB) *ProfileSnapshotStore {
	return &ProfileSnapshotStore{db: db}
}

func (s *ProfileSnapshotStore) GetByPhone(ctx context.Context, phone string) (model.ProfileSnapshot, error) {
	var row model.ProfileSnapshot
	err := s.db.WithContext(ctx).
		Where("phone = ?", strings.TrimSpace(phone)).
		First(&row).Error
	if err != nil {
		return model.ProfileSnapshot{}, err
	}
	return row, nil
}

// GetByPhoneForOwner 仅返回本人（或历史 anonymous）名下的画像。
func (s *ProfileSnapshotStore) GetByPhoneForOwner(ctx context.Context, phone, ownerID string) (model.ProfileSnapshot, error) {
	var row model.ProfileSnapshot
	err := s.db.WithContext(ctx).
		Where("phone = ? AND (owner_id = ? OR owner_id = ? OR owner_id = ?)",
			strings.TrimSpace(phone), strings.TrimSpace(ownerID), "anonymous", "").
		First(&row).Error
	if err != nil {
		return model.ProfileSnapshot{}, err
	}
	return row, nil
}

// ReplaceByPhoneForOwner 覆盖本人名下该手机号画像；不删除他人记录。
func (s *ProfileSnapshotStore) ReplaceByPhoneForOwner(ctx context.Context, row model.ProfileSnapshot) (model.ProfileSnapshot, error) {
	phone := strings.TrimSpace(row.Phone)
	owner := strings.TrimSpace(row.OwnerID)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("phone = ? AND (owner_id = ? OR owner_id = ? OR owner_id = ?)",
			phone, owner, "anonymous", "").
			Delete(&model.ProfileSnapshot{}).Error; err != nil {
			return err
		}
		row.Phone = phone
		row.OwnerID = owner
		return tx.Create(&row).Error
	})
	if err != nil {
		return model.ProfileSnapshot{}, err
	}
	return s.GetByPhoneForOwner(ctx, phone, owner)
}

func (s *ProfileSnapshotStore) DeleteByPhoneForOwner(ctx context.Context, phone, ownerID string) error {
	res := s.db.WithContext(ctx).
		Where("phone = ? AND (owner_id = ? OR owner_id = ? OR owner_id = ?)",
			strings.TrimSpace(phone), strings.TrimSpace(ownerID), "anonymous", "").
		Delete(&model.ProfileSnapshot{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
