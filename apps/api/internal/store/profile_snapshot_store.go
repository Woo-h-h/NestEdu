package store

import (
	"context"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

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

// ReplaceByPhone 删除该手机号下旧画像后写入新快照（同一手机号只保留一份）。
func (s *ProfileSnapshotStore) ReplaceByPhone(ctx context.Context, row model.ProfileSnapshot) (model.ProfileSnapshot, error) {
	phone := strings.TrimSpace(row.Phone)
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("phone = ?", phone).Delete(&model.ProfileSnapshot{}).Error; err != nil {
			return err
		}
		row.Phone = phone
		return tx.Create(&row).Error
	})
	if err != nil {
		return model.ProfileSnapshot{}, err
	}
	return s.GetByPhone(ctx, phone)
}

func (s *ProfileSnapshotStore) DeleteByPhone(ctx context.Context, phone string) error {
	res := s.db.WithContext(ctx).Where("phone = ?", strings.TrimSpace(phone)).Delete(&model.ProfileSnapshot{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
