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
	ErrProfileForbidden        = errors.New("profile snapshot belongs to another user")
	ErrOwnerRequired           = errors.New("owner id is required")
)

var mainlandMobileRE = regexp.MustCompile(`^1\d{10}$`)

type ProfileSnapshotRepository interface {
	GetByPhoneForOwner(ctx context.Context, phone, ownerID string) (model.ProfileSnapshot, error)
	GetByPhone(ctx context.Context, phone string) (model.ProfileSnapshot, error)
	ReplaceByPhoneForOwner(ctx context.Context, row model.ProfileSnapshot) (model.ProfileSnapshot, error)
	DeleteByPhoneForOwner(ctx context.Context, phone, ownerID string) error
}

// ProfileSnapshotService 教师画像快照编排：按手机号+本人 owner 读写，新生成覆盖旧记录。
type ProfileSnapshotService struct {
	repo ProfileSnapshotRepository
}

func NewProfileSnapshotService(repo ProfileSnapshotRepository) *ProfileSnapshotService {
	return &ProfileSnapshotService{repo: repo}
}

func (s *ProfileSnapshotService) GetByPhone(ctx context.Context, ownerID, phone string) (model.ProfileSnapshotPayload, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return model.ProfileSnapshotPayload{}, ErrOwnerRequired
	}
	normalized, err := normalizePhone(phone)
	if err != nil {
		return model.ProfileSnapshotPayload{}, err
	}
	row, err := s.repo.GetByPhoneForOwner(ctx, normalized, owner)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.ProfileSnapshotPayload{}, ErrProfileNotFound
		}
		return model.ProfileSnapshotPayload{}, err
	}
	return toProfilePayload(row)
}

func (s *ProfileSnapshotService) Save(ctx context.Context, ownerID string, payload model.ProfileSnapshotPayload) (model.ProfileSnapshotPayload, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return model.ProfileSnapshotPayload{}, ErrOwnerRequired
	}
	normalized, err := normalizePhone(payload.Phone)
	if err != nil {
		return model.ProfileSnapshotPayload{}, err
	}
	markdown := strings.TrimSpace(payload.Markdown)
	if markdown == "" {
		return model.ProfileSnapshotPayload{}, ErrProfileMarkdownRequired
	}

	// 若该手机号已有他人画像，拒绝覆盖
	if existing, getErr := s.repo.GetByPhone(ctx, normalized); getErr == nil {
		existingOwner := strings.TrimSpace(existing.OwnerID)
		if existingOwner != "" && existingOwner != "anonymous" && existingOwner != owner {
			return model.ProfileSnapshotPayload{}, ErrProfileForbidden
		}
	} else if !errors.Is(getErr, gorm.ErrRecordNotFound) {
		return model.ProfileSnapshotPayload{}, getErr
	}

	now := time.Now().UTC()
	generatedAt := now
	if raw := strings.TrimSpace(payload.GeneratedAt); raw != "" {
		if parsed, parseErr := time.Parse(time.RFC3339Nano, raw); parseErr == nil {
			generatedAt = parsed.UTC()
		} else if parsed, parseErr := time.Parse(time.RFC3339, raw); parseErr == nil {
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
		OwnerID:          owner,
		DisplayName:      strings.TrimSpace(payload.DisplayName),
		AgentID:          payload.AgentID,
		Markdown:         markdown,
		ArchiveDocCount:  payload.ArchiveDocCount,
		LocalRecordCount: payload.LocalRecordCount,
		FolderIDsJSON:    string(folderJSON),
		GeneratedAt:      generatedAt,
	}

	saved, err := s.repo.ReplaceByPhoneForOwner(ctx, row)
	if err != nil {
		return model.ProfileSnapshotPayload{}, err
	}
	return toProfilePayload(saved)
}

func (s *ProfileSnapshotService) DeleteByPhone(ctx context.Context, ownerID, phone string) error {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return ErrOwnerRequired
	}
	normalized, err := normalizePhone(phone)
	if err != nil {
		return err
	}
	if err := s.repo.DeleteByPhoneForOwner(ctx, normalized, owner); err != nil {
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
