package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

var (
	ErrProfileActionIDRequired = errors.New("action id is required")
)

type ProfileActionRepository interface {
	GetByOwner(ctx context.Context, ownerID string) (model.ProfileActionBundle, error)
	Upsert(ctx context.Context, row model.ProfileActionBundle) (model.ProfileActionBundle, error)
}

// ProfileActionService 画像行动计划状态编排（按 owner 一份 JSON map）。
type ProfileActionService struct {
	repo ProfileActionRepository
}

func NewProfileActionService(repo ProfileActionRepository) *ProfileActionService {
	return &ProfileActionService{repo: repo}
}

func (s *ProfileActionService) Get(ctx context.Context, ownerID string) (model.ProfileActionBundlePayload, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return model.ProfileActionBundlePayload{}, ErrOwnerRequired
	}
	row, err := s.repo.GetByOwner(ctx, owner)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.ProfileActionBundlePayload{States: map[string]model.ProfileActionState{}}, nil
		}
		return model.ProfileActionBundlePayload{}, err
	}
	return toActionBundlePayload(row)
}

func (s *ProfileActionService) Replace(ctx context.Context, ownerID string, states map[string]model.ProfileActionState) (model.ProfileActionBundlePayload, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return model.ProfileActionBundlePayload{}, ErrOwnerRequired
	}
	if states == nil {
		states = map[string]model.ProfileActionState{}
	}
	normalized := normalizeActionStates(states)
	raw, err := json.Marshal(normalized)
	if err != nil {
		return model.ProfileActionBundlePayload{}, err
	}
	saved, err := s.repo.Upsert(ctx, model.ProfileActionBundle{
		OwnerID: owner,
		States:  string(raw),
	})
	if err != nil {
		return model.ProfileActionBundlePayload{}, err
	}
	return toActionBundlePayload(saved)
}

func (s *ProfileActionService) Patch(ctx context.Context, ownerID string, patch model.ProfileActionPatchPayload) (model.ProfileActionBundlePayload, error) {
	owner := strings.TrimSpace(ownerID)
	if owner == "" {
		return model.ProfileActionBundlePayload{}, ErrOwnerRequired
	}
	id := strings.TrimSpace(patch.ID)
	if id == "" {
		return model.ProfileActionBundlePayload{}, ErrProfileActionIDRequired
	}

	current, err := s.Get(ctx, owner)
	if err != nil {
		return model.ProfileActionBundlePayload{}, err
	}
	prev := current.States[id]
	next := prev
	if patch.Checked != nil {
		next.Checked = *patch.Checked
	}
	if status := strings.TrimSpace(patch.Status); status != "" {
		next.Status = normalizeActionStatus(status)
	}
	next.Date = strings.TrimSpace(patch.Date)
	if patch.Progress != nil {
		next.Progress = clampProgress(*patch.Progress)
	}
	if next.Status == "" {
		next.Status = "planned"
	}
	current.States[id] = next
	return s.Replace(ctx, owner, current.States)
}

func normalizeActionStates(in map[string]model.ProfileActionState) map[string]model.ProfileActionState {
	out := make(map[string]model.ProfileActionState, len(in))
	for id, st := range in {
		key := strings.TrimSpace(id)
		if key == "" {
			continue
		}
		out[key] = model.ProfileActionState{
			Checked:  st.Checked,
			Status:   normalizeActionStatus(st.Status),
			Date:     strings.TrimSpace(st.Date),
			Progress: clampProgress(st.Progress),
		}
	}
	return out
}

func normalizeActionStatus(status string) string {
	switch strings.TrimSpace(status) {
	case "completed", "dismissed", "planned":
		return strings.TrimSpace(status)
	default:
		return "planned"
	}
}

func clampProgress(n int) int {
	if n < 0 {
		return 0
	}
	if n > 100 {
		return 100
	}
	return n
}

func toActionBundlePayload(row model.ProfileActionBundle) (model.ProfileActionBundlePayload, error) {
	states := map[string]model.ProfileActionState{}
	if raw := strings.TrimSpace(row.States); raw != "" {
		if err := json.Unmarshal([]byte(raw), &states); err != nil {
			return model.ProfileActionBundlePayload{}, err
		}
	}
	return model.ProfileActionBundlePayload{
		States:    normalizeActionStates(states),
		UpdatedAt: row.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
	}, nil
}
