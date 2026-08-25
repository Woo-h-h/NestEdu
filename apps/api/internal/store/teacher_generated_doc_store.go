package store

import (
	"context"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// TeacherGeneratedDocStore 用 GORM 访问 teacher_generated_docs（按 knowledge_doc_id Upsert）。
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
			"phone", "owner_id", "doc_type", "title", "knowledge_id", "category_id",
			"storage", "content", "year", "updated_at",
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

func (s *TeacherGeneratedDocStore) ListByPhoneAndOwner(
	ctx context.Context,
	phone, ownerID, docType string,
	limit, offset int,
) ([]model.TeacherGeneratedDoc, error) {
	q := s.db.WithContext(ctx).Where(
		"phone = ? AND (owner_id = ? OR owner_id = ? OR owner_id = ?)",
		strings.TrimSpace(phone), strings.TrimSpace(ownerID), "anonymous", "",
	)
	if dt := strings.TrimSpace(docType); dt != "" {
		q = q.Where("doc_type = ?", dt)
	}
	if limit > 0 {
		q = q.Limit(limit)
	}
	if offset > 0 {
		q = q.Offset(offset)
	}
	var rows []model.TeacherGeneratedDoc
	if err := q.Order("created_at DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

func (s *TeacherGeneratedDocStore) CountByPhoneAndOwner(ctx context.Context, phone, ownerID string) (activity, weekly int64, err error) {
	phone = strings.TrimSpace(phone)
	owner := strings.TrimSpace(ownerID)
	ownerClause := "(owner_id = ? OR owner_id = ? OR owner_id = ?)"
	if err = s.db.WithContext(ctx).Model(&model.TeacherGeneratedDoc{}).
		Where("phone = ? AND doc_type = ? AND "+ownerClause, phone, "activity", owner, "anonymous", "").
		Count(&activity).Error; err != nil {
		return
	}
	if err = s.db.WithContext(ctx).Model(&model.TeacherGeneratedDoc{}).
		Where("phone = ? AND doc_type = ? AND "+ownerClause, phone, "weekly", owner, "anonymous", "").
		Count(&weekly).Error; err != nil {
		return
	}
	return
}

func (s *TeacherGeneratedDocStore) DeleteByKnowledgeDocIDAndOwner(ctx context.Context, knowledgeDocID, ownerID string) error {
	res := s.db.WithContext(ctx).
		Where("knowledge_doc_id = ? AND (owner_id = ? OR owner_id = ? OR owner_id = ?)",
			strings.TrimSpace(knowledgeDocID), strings.TrimSpace(ownerID), "anonymous", "").
		Delete(&model.TeacherGeneratedDoc{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
