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
	ErrGeneratedDocPhoneRequired = errors.New("phone is required")
	ErrGeneratedDocPhoneInvalid  = errors.New("phone must be an 11-digit mainland mobile number")
	ErrGeneratedDocTypeInvalid   = errors.New("docType must be activity or weekly")
	ErrGeneratedDocTitleRequired = errors.New("title is required")
	ErrGeneratedDocIDRequired    = errors.New("knowledgeDocId is required")
	ErrGeneratedDocNotFound      = errors.New("teacher generated doc not found")
)

type TeacherGeneratedDocRepository interface {
	Upsert(ctx context.Context, row model.TeacherGeneratedDoc) (model.TeacherGeneratedDoc, error)
	ListByPhone(ctx context.Context, phone, docType string) ([]model.TeacherGeneratedDoc, error)
	CountByPhone(ctx context.Context, phone string) (activity, weekly int64, err error)
	DeleteByKnowledgeDocID(ctx context.Context, knowledgeDocID string) error
}

type TeacherGeneratedDocService struct {
	repo TeacherGeneratedDocRepository
}

func NewTeacherGeneratedDocService(repo TeacherGeneratedDocRepository) *TeacherGeneratedDocService {
	return &TeacherGeneratedDocService{repo: repo}
}

func (s *TeacherGeneratedDocService) Save(ctx context.Context, ownerID string, payload model.TeacherGeneratedDocPayload) (model.TeacherGeneratedDocPayload, error) {
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

	id := strings.TrimSpace(payload.ID)
	if id == "" {
		id = fmt.Sprintf("tgd_%s_%d", phone, time.Now().UnixMilli())
	}
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		owner = "anonymous"
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
	})
	if err != nil {
		return model.TeacherGeneratedDocPayload{}, err
	}
	return toGeneratedDocPayload(saved), nil
}

func (s *TeacherGeneratedDocService) List(ctx context.Context, phone, docType string) ([]model.TeacherGeneratedDocPayload, error) {
	normalized, err := normalizePhone(phone)
	if err != nil {
		return nil, err
	}
	if dt := strings.TrimSpace(docType); dt != "" && dt != "activity" && dt != "weekly" {
		return nil, ErrGeneratedDocTypeInvalid
	}
	rows, err := s.repo.ListByPhone(ctx, normalized, docType)
	if err != nil {
		return nil, err
	}
	out := make([]model.TeacherGeneratedDocPayload, 0, len(rows))
	for _, row := range rows {
		out = append(out, toGeneratedDocPayload(row))
	}
	return out, nil
}

func (s *TeacherGeneratedDocService) Stats(ctx context.Context, phone string) (model.TeacherGeneratedDocStats, error) {
	normalized, err := normalizePhone(phone)
	if err != nil {
		return model.TeacherGeneratedDocStats{}, err
	}
	activity, weekly, err := s.repo.CountByPhone(ctx, normalized)
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

func (s *TeacherGeneratedDocService) DeleteByKnowledgeDocID(ctx context.Context, knowledgeDocID string) error {
	id := strings.TrimSpace(knowledgeDocID)
	if id == "" {
		return ErrGeneratedDocIDRequired
	}
	if err := s.repo.DeleteByKnowledgeDocID(ctx, id); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrGeneratedDocNotFound
		}
		return err
	}
	return nil
}

func toGeneratedDocPayload(row model.TeacherGeneratedDoc) model.TeacherGeneratedDocPayload {
	return model.TeacherGeneratedDocPayload{
		ID:             row.ID,
		Phone:          row.Phone,
		DocType:        row.DocType,
		KnowledgeDocID: row.KnowledgeDocID,
		Title:          row.Title,
		KnowledgeID:    row.KnowledgeID,
		CategoryID:     row.CategoryID,
		CreatedAt:      row.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:      row.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
