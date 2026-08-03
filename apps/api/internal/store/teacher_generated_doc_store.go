package store

import (
	"context"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type TeacherGeneratedDocStore struct {
	db *gorm.DB
}

func NewTeacherGeneratedDocStore(db *gorm.DB) *TeacherGeneratedDocStore {
	return &TeacherGeneratedDocStore{db: db}
}

func (s *TeacherGeneratedDocStore) Upsert(ctx context.Context, row model.TeacherGeneratedDoc) (model.TeacherGeneratedDoc, error) {
	err := s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "knowledge_doc_id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"phone", "owner_id", "doc_type", "title", "knowledge_id", "category_id", "updated_at",
		}),
	}).Create(&row).Error
	if err != nil {
		return model.TeacherGeneratedDoc{}, err
	}
	var saved model.TeacherGeneratedDoc
	if err := s.db.WithContext(ctx).
		Where("knowledge_doc_id = ?", row.KnowledgeDocID).
		First(&saved).Error; err != nil {
		return model.TeacherGeneratedDoc{}, err
	}
	return saved, nil
}

func (s *TeacherGeneratedDocStore) ListByPhone(ctx context.Context, phone, docType string) ([]model.TeacherGeneratedDoc, error) {
	q := s.db.WithContext(ctx).Where("phone = ?", strings.TrimSpace(phone))
	if dt := strings.TrimSpace(docType); dt != "" {
		q = q.Where("doc_type = ?", dt)
	}
	var rows []model.TeacherGeneratedDoc
	if err := q.Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *TeacherGeneratedDocStore) CountByPhone(ctx context.Context, phone string) (activity, weekly int64, err error) {
	phone = strings.TrimSpace(phone)
	if err = s.db.WithContext(ctx).Model(&model.TeacherGeneratedDoc{}).
		Where("phone = ? AND doc_type = ?", phone, "activity").
		Count(&activity).Error; err != nil {
		return
	}
	if err = s.db.WithContext(ctx).Model(&model.TeacherGeneratedDoc{}).
		Where("phone = ? AND doc_type = ?", phone, "weekly").
		Count(&weekly).Error; err != nil {
		return
	}
	return
}

func (s *TeacherGeneratedDocStore) DeleteByKnowledgeDocID(ctx context.Context, knowledgeDocID string) error {
	res := s.db.WithContext(ctx).
		Where("knowledge_doc_id = ?", strings.TrimSpace(knowledgeDocID)).
		Delete(&model.TeacherGeneratedDoc{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
