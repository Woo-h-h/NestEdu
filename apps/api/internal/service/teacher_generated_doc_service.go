package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

var (
	ErrGeneratedDocPhoneRequired   = errors.New("phone is required")
	ErrGeneratedDocPhoneInvalid    = errors.New("phone must be an 11-digit mainland mobile number")
	ErrGeneratedDocTypeInvalid     = errors.New("docType must be activity or weekly")
	ErrGeneratedDocTitleRequired   = errors.New("title is required")
	ErrGeneratedDocIDRequired      = errors.New("knowledgeDocId is required")
	ErrGeneratedDocNotFound        = errors.New("teacher generated doc not found")
	ErrGeneratedDocStorageInvalid  = errors.New("storage must be mysql or platform")
	ErrGeneratedDocContentRequired = errors.New("content is required when storage is mysql")
	ErrGeneratedDocForbidden       = errors.New("teacher generated doc belongs to another user")
)

type TeacherGeneratedDocRepository interface {
	Upsert(ctx context.Context, row model.TeacherGeneratedDoc) (model.TeacherGeneratedDoc, error)
	ListByPhoneAndOwner(ctx context.Context, phone, ownerID, docType string, limit, offset int) ([]model.TeacherGeneratedDoc, error)
	CountByPhoneAndOwner(ctx context.Context, phone, ownerID string) (activity, weekly int64, err error)
	DeleteByKnowledgeDocIDAndOwner(ctx context.Context, knowledgeDocID, ownerID string) error
}

// TeacherGeneratedDocService 本人入库计数映射编排（activity/weekly，storage=mysql|platform）。
type TeacherGeneratedDocService struct {
	repo TeacherGeneratedDocRepository
}

func NewTeacherGeneratedDocService(repo TeacherGeneratedDocRepository) *TeacherGeneratedDocService {
	return &TeacherGeneratedDocService{repo: repo}
}

func (s *TeacherGeneratedDocService) Save(ctx context.Context, ownerID string, payload model.TeacherGeneratedDocPayload) (model.TeacherGeneratedDocPayload, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return model.TeacherGeneratedDocPayload{}, ErrOwnerRequired
	}
	phone, err := normalizePhone(payload.Phone)
	if err != nil {
		return model.TeacherGeneratedDocPayload{}, err
	}
	docType := strings.TrimSpace(payload.DocType)
	if docType != "activity" && docType != "weekly" {
		return model.TeacherGeneratedDocPayload{}, ErrGeneratedDocTypeInvalid
	}
	title := strings.TrimSpace(payload.Title)
	if title == "" {
		return model.TeacherGeneratedDocPayload{}, ErrGeneratedDocTitleRequired
	}
	knowledgeDocID := strings.TrimSpace(payload.KnowledgeDocID)
	if knowledgeDocID == "" {
		return model.TeacherGeneratedDocPayload{}, ErrGeneratedDocIDRequired
	}

	storage := strings.TrimSpace(payload.Storage)
	if storage == "" {
		storage = "platform"
	}
	if storage != "mysql" && storage != "platform" {
		return model.TeacherGeneratedDocPayload{}, ErrGeneratedDocStorageInvalid
	}
	content := strings.TrimSpace(payload.Content)
	if storage == "mysql" && content == "" {
		return model.TeacherGeneratedDocPayload{}, ErrGeneratedDocContentRequired
	}
	// platform 映射一般不落全文，避免表膨胀；若前端传了也允许覆盖
	if storage == "platform" && content == "" {
		content = ""
	}

	id := strings.TrimSpace(payload.ID)
	if id == "" {
		id = fmt.Sprintf("tgd_%s_%s", phone, knowledgeDocID)
		if len(id) > 64 {
			id = fmt.Sprintf("tgd_%d_%s", time.Now().UnixNano(), knowledgeDocID)
			if len(id) > 64 {
				id = id[:64]
			}
		}
	}

	saved, err := s.repo.Upsert(ctx, model.TeacherGeneratedDoc{
		ID:             id,
		Phone:          phone,
		OwnerID:        owner,
		DocType:        docType,
		KnowledgeDocID: knowledgeDocID,
		Title:          title,
		KnowledgeID:    strings.TrimSpace(payload.KnowledgeID),
		CategoryID:     strings.TrimSpace(payload.CategoryID),
		Storage:        storage,
		Content:        content,
	})
	if err != nil {
		return model.TeacherGeneratedDocPayload{}, err
	}
	return toGeneratedDocPayload(saved, true), nil
}

func (s *TeacherGeneratedDocService) List(
	ctx context.Context,
	ownerID, phone, docType string,
	page, limit int,
) ([]model.TeacherGeneratedDocPayload, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return nil, ErrOwnerRequired
	}
	normalized, err := normalizePhone(phone)
	if err != nil {
		return nil, err
	}
	if dt := strings.TrimSpace(docType); dt != "" && dt != "activity" && dt != "weekly" {
		return nil, ErrGeneratedDocTypeInvalid
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 100
	}
	if limit > 200 {
		limit = 200
	}
	offset := (page - 1) * limit
	rows, err := s.repo.ListByPhoneAndOwner(ctx, normalized, owner, docType, limit, offset)
	if err != nil {
		return nil, err
	}
	out := make([]model.TeacherGeneratedDocPayload, 0, len(rows))
	for _, row := range rows {
		// platform 映射不回传全文；mysql 私有文档需带回正文供「我的」展示
		includeContent := strings.EqualFold(strings.TrimSpace(row.Storage), "mysql")
		out = append(out, toGeneratedDocPayload(row, includeContent))
	}
	return out, nil
}

func (s *TeacherGeneratedDocService) Stats(ctx context.Context, ownerID, phone string) (model.TeacherGeneratedDocStats, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return model.TeacherGeneratedDocStats{}, ErrOwnerRequired
	}
	normalized, err := normalizePhone(phone)
	if err != nil {
		return model.TeacherGeneratedDocStats{}, err
	}
	activity, weekly, err := s.repo.CountByPhoneAndOwner(ctx, normalized, owner)
	if err != nil {
		return model.TeacherGeneratedDocStats{}, err
	}
	return model.TeacherGeneratedDocStats{
		Phone:    normalized,
		Activity: activity,
		Weekly:   weekly,
		Total:    activity + weekly,
	}, nil
}

func (s *TeacherGeneratedDocService) DeleteByKnowledgeDocID(ctx context.Context, ownerID, knowledgeDocID string) error {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return ErrOwnerRequired
	}
	id := strings.TrimSpace(knowledgeDocID)
	if id == "" {
		return ErrGeneratedDocIDRequired
	}
	if err := s.repo.DeleteByKnowledgeDocIDAndOwner(ctx, id, owner); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrGeneratedDocNotFound
		}
		return err
	}
	return nil
}

func toGeneratedDocPayload(row model.TeacherGeneratedDoc, includeContent bool) model.TeacherGeneratedDocPayload {
	storage := strings.TrimSpace(row.Storage)
	if storage == "" {
		storage = "platform"
	}
	content := ""
	if includeContent {
		content = row.Content
	}
	return model.TeacherGeneratedDocPayload{
		ID:             row.ID,
		Phone:          row.Phone,
		DocType:        row.DocType,
		KnowledgeDocID: row.KnowledgeDocID,
		Title:          row.Title,
		KnowledgeID:    row.KnowledgeID,
		CategoryID:     row.CategoryID,
		Storage:        storage,
		Content:        content,
		CreatedAt:      row.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:      row.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
