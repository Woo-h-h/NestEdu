package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

var (
	ErrArchiveAchievementIDRequired    = errors.New("knowledgeDocId is required")
	ErrArchiveAchievementTitleRequired = errors.New("title is required")
	ErrArchiveAchievementNotFound      = errors.New("archive achievement not found")
	ErrArchiveAchievementForbidden     = errors.New("archive achievement belongs to another user")
	ErrArchiveAchievementYearInvalid   = errors.New("year must be 0 or between 1990 and next calendar year")
)

type ArchiveAchievementRepository interface {
	Upsert(ctx context.Context, row model.ArchiveAchievement) (model.ArchiveAchievement, error)
	ListByPhoneAndOwner(ctx context.Context, phone, ownerID string, limit, offset int) ([]model.ArchiveAchievement, error)
	DeleteByKnowledgeDocIDAndOwner(ctx context.Context, knowledgeDocID, ownerID string) error
}

type ArchiveAchievementService struct {
	repo ArchiveAchievementRepository
}

func NewArchiveAchievementService(repo ArchiveAchievementRepository) *ArchiveAchievementService {
	return &ArchiveAchievementService{repo: repo}
}

func NormalizeTreeCategory(raw string) string {
	s := strings.TrimSpace(raw)
	switch s {
	case "practice", "research", "honor":
		return s
	}
	has := func(parts ...string) bool {
		for _, p := range parts {
			if strings.Contains(s, p) {
				return true
			}
		}
		return false
	}
	if has("教研", "科研", "论文", "课题", "公开课", "个案", "课例") {
		return "research"
	}
	if has("荣誉", "获奖", "表彰", "奖状", "证书", "研修", "培训", "观摩", "骨干") {
		return "honor"
	}
	if has("专业研究成果") {
		return "research"
	}
	if has("获奖与荣誉", "学习与研修") {
		return "honor"
	}
	return "practice"
}

func NormalizeAchievementYear(year int) (int, error) {
	max := time.Now().Year() + 1
	if year == 0 {
		return 0, nil
	}
	if year < 1990 || year > max {
		return 0, ErrArchiveAchievementYearInvalid
	}
	return year, nil
}

func (s *ArchiveAchievementService) Save(ctx context.Context, ownerID string, payload model.ArchiveAchievementPayload) (model.ArchiveAchievementPayload, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return model.ArchiveAchievementPayload{}, ErrOwnerRequired
	}
	phone, err := normalizePhone(payload.Phone)
	if err != nil {
		return model.ArchiveAchievementPayload{}, err
	}
	title := strings.TrimSpace(payload.Title)
	if title == "" {
		return model.ArchiveAchievementPayload{}, ErrArchiveAchievementTitleRequired
	}
	knowledgeDocID := strings.TrimSpace(payload.KnowledgeDocID)
	if knowledgeDocID == "" {
		return model.ArchiveAchievementPayload{}, ErrArchiveAchievementIDRequired
	}
	year, err := NormalizeAchievementYear(payload.Year)
	if err != nil {
		return model.ArchiveAchievementPayload{}, err
	}
	tree := NormalizeTreeCategory(payload.TreeCategory)
	if tree == "" {
		tree = "practice"
	}

	id := strings.TrimSpace(payload.ID)
	if id == "" {
		id = fmt.Sprintf("aa_%s_%s", phone, knowledgeDocID)
		id = compactID(id, 64)
	}

	saved, err := s.repo.Upsert(ctx, model.ArchiveAchievement{
		ID:               id,
		Phone:            phone,
		OwnerID:          owner,
		KnowledgeDocID:   knowledgeDocID,
		Title:            title,
		TreeCategory:     tree,
		Year:             year,
		MaterialType:     strings.TrimSpace(payload.MaterialType),
		Summary:          strings.TrimSpace(payload.Summary),
		NeedsHumanReview: payload.NeedsHumanReview,
		KnowledgeID:      strings.TrimSpace(payload.KnowledgeID),
		CategoryID:       strings.TrimSpace(payload.CategoryID),
	})
	if err != nil {
		return model.ArchiveAchievementPayload{}, err
	}
	return toArchiveAchievementPayload(saved), nil
}

func (s *ArchiveAchievementService) List(
	ctx context.Context,
	ownerID, phone string,
	page, limit int,
) ([]model.ArchiveAchievementPayload, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return nil, ErrOwnerRequired
	}
	normalized, err := normalizePhone(phone)
	if err != nil {
		return nil, err
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
	rows, err := s.repo.ListByPhoneAndOwner(ctx, normalized, owner, limit, offset)
	if err != nil {
		return nil, err
	}
	out := make([]model.ArchiveAchievementPayload, 0, len(rows))
	for _, row := range rows {
		out = append(out, toArchiveAchievementPayload(row))
	}
	return out, nil
}

func (s *ArchiveAchievementService) DeleteByKnowledgeDocID(ctx context.Context, ownerID, knowledgeDocID string) error {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return ErrOwnerRequired
	}
	id := strings.TrimSpace(knowledgeDocID)
	if id == "" {
		return ErrArchiveAchievementIDRequired
	}
	if err := s.repo.DeleteByKnowledgeDocIDAndOwner(ctx, id, owner); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrArchiveAchievementNotFound
		}
		return err
	}
	return nil
}

func toArchiveAchievementPayload(row model.ArchiveAchievement) model.ArchiveAchievementPayload {
	return model.ArchiveAchievementPayload{
		ID:               row.ID,
		Phone:            row.Phone,
		KnowledgeDocID:   row.KnowledgeDocID,
		Title:            row.Title,
		TreeCategory:     row.TreeCategory,
		Year:             row.Year,
		MaterialType:     row.MaterialType,
		Summary:          row.Summary,
		NeedsHumanReview: row.NeedsHumanReview,
		KnowledgeID:      row.KnowledgeID,
		CategoryID:       row.CategoryID,
		CreatedAt:        row.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:        row.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func compactID(raw string, max int) string {
	var b strings.Builder
	for _, r := range raw {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '_' || r == '-' {
			b.WriteRune(r)
		}
	}
	id := b.String()
	if id == "" {
		id = fmt.Sprintf("aa_%d", time.Now().UnixNano())
	}
	if len(id) > max {
		return id[:max]
	}
	return id
}
