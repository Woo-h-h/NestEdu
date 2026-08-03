package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

var (
	ErrProfilePhoneRequired    = errors.New("phone is required")
	ErrProfilePhoneInvalid     = errors.New("phone must be an 11-digit mainland mobile number")
	ErrProfileMarkdownRequired = errors.New("markdown is required")
	ErrProfileNotFound         = errors.New("profile snapshot not found")
)

var mainlandMobileRE = regexp.MustCompile(`^1\d{10}$`)

type ProfileSnapshotRepository interface {
	GetByPhone(ctx context.Context, phone string) (model.ProfileSnapshot, error)
	ReplaceByPhone(ctx context.Context, row model.ProfileSnapshot) (model.ProfileSnapshot, error)
	DeleteByPhone(ctx context.Context, phone string) error
}

type ProfileSnapshotService struct {
	repo ProfileSnapshotRepository
}

func NewProfileSnapshotService(repo ProfileSnapshotRepository) *ProfileSnapshotService {
	return &ProfileSnapshotService{repo: repo}
}

func (s *ProfileSnapshotService) GetByPhone(ctx context.Context, phone string) (model.ProfileSnapshotPayload, error) {
	normalized, err := normalizePhone(phone)
	if err != nil {
		return model.ProfileSnapshotPayload{}, err
	}
	row, err := s.repo.GetByPhone(ctx, normalized)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.ProfileSnapshotPayload{}, ErrProfileNotFound
		}
		return model.ProfileSnapshotPayload{}, err
	}
	return toProfilePayload(row)
}

func (s *ProfileSnapshotService) Save(ctx context.Context, ownerID string, payload model.ProfileSnapshotPayload) (model.ProfileSnapshotPayload, error) {
	normalized, err := normalizePhone(payload.Phone)
	if err != nil {
		return model.ProfileSnapshotPayload{}, err
	}
	markdown := strings.TrimSpace(payload.Markdown)
	if markdown == "" {
		return model.ProfileSnapshotPayload{}, ErrProfileMarkdownRequired
	}

	now := time.Now().UTC()
	generatedAt := now
	if raw := strings.TrimSpace(payload.GeneratedAt); raw != "" {
		if parsed, parseErr := time.Parse(time.RFC3339, raw); parseErr == nil {
			generatedAt = parsed.UTC()
		}
	}

	folderIDs := payload.FolderIDs
	if folderIDs == nil {
		folderIDs = []string{}
	}
	folderJSON, err := json.Marshal(folderIDs)
	if err != nil {
		return model.ProfileSnapshotPayload{}, fmt.Errorf("encode folderIds: %w", err)
	}

	id := strings.TrimSpace(payload.ID)
	if id == "" {
		id = fmt.Sprintf("ps_%s_%d", normalized, now.UnixMilli())
	}

	row := model.ProfileSnapshot{
		ID:               id,
		Phone:            normalized,
		OwnerID:          strings.TrimSpace(ownerID),
		DisplayName:      strings.TrimSpace(payload.DisplayName),
		AgentID:          payload.AgentID,
		Markdown:         markdown,
		ArchiveDocCount:  payload.ArchiveDocCount,
		LocalRecordCount: payload.LocalRecordCount,
		FolderIDsJSON:    string(folderJSON),
		GeneratedAt:      generatedAt,
	}
	if row.OwnerID == "" {
		row.OwnerID = "anonymous"
	}

	saved, err := s.repo.ReplaceByPhone(ctx, row)
	if err != nil {
		return model.ProfileSnapshotPayload{}, err
	}
	return toProfilePayload(saved)
}

func (s *ProfileSnapshotService) DeleteByPhone(ctx context.Context, phone string) error {
	normalized, err := normalizePhone(phone)
	if err != nil {
		return err
	}
	if err := s.repo.DeleteByPhone(ctx, normalized); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrProfileNotFound
		}
		return err
	}
	return nil
}

func normalizePhone(phone string) (string, error) {
	normalized := strings.TrimSpace(phone)
	if normalized == "" {
		return "", ErrProfilePhoneRequired
	}
	if !mainlandMobileRE.MatchString(normalized) {
		return "", ErrProfilePhoneInvalid
	}
	return normalized, nil
}

func toProfilePayload(row model.ProfileSnapshot) (model.ProfileSnapshotPayload, error) {
	folderIDs := []string{}
	if raw := strings.TrimSpace(row.FolderIDsJSON); raw != "" {
		if err := json.Unmarshal([]byte(raw), &folderIDs); err != nil {
			return model.ProfileSnapshotPayload{}, fmt.Errorf("decode folderIds: %w", err)
		}
	}
	return model.ProfileSnapshotPayload{
		ID:               row.ID,
		Phone:            row.Phone,
		DisplayName:      row.DisplayName,
		AgentID:          row.AgentID,
		Markdown:         row.Markdown,
		ArchiveDocCount:  row.ArchiveDocCount,
		LocalRecordCount: row.LocalRecordCount,
		FolderIDs:        folderIDs,
		GeneratedAt:      row.GeneratedAt.UTC().Format(time.RFC3339),
		CreatedAt:        row.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:        row.UpdatedAt.UTC().Format(time.RFC3339),
	}, nil
}
