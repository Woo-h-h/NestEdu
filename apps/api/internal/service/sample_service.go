package service

import (
	"context"
	"errors"
	"strings"

	"github.com/your-org/mvp-template/apps/api/internal/model"
	"gorm.io/gorm"
)

var (
	ErrSampleNameRequired = errors.New("name is required")
	ErrSampleItemNotFound = errors.New("sample item not found")
)

type SampleRepository interface {
	ListItems(ctx context.Context, page int, limit int) ([]model.SampleItem, int64, error)
	CreateItem(ctx context.Context, item model.SampleItem) (model.SampleItem, error)
	UpdateItem(ctx context.Context, id uint, item model.SampleItem) (model.SampleItem, error)
	DeleteItem(ctx context.Context, id uint) error
}

// SampleService 模板样例业务编排（非 NestEdu 核心域）。
type SampleService struct {
	repo SampleRepository
}

type ListSampleItemsParams struct {
	Page  int
	Limit int
}

type ListSampleItemsResult struct {
	Items []model.SampleItem
	Total int64
	Page  int
	Limit int
}

type CreateSampleItemInput struct {
	Name        string
	Description string
}

type UpdateSampleItemInput struct {
	Name        string
	Description string
}

func NewSampleService(repo SampleRepository) *SampleService {
	return &SampleService{repo: repo}
}

func (s *SampleService) ListItems(ctx context.Context, params ListSampleItemsParams) (ListSampleItemsResult, error) {
	page, limit := normalizePagination(params.Page, params.Limit)
	items, total, err := s.repo.ListItems(ctx, page, limit)
	if err != nil {
		return ListSampleItemsResult{}, err
	}
	return ListSampleItemsResult{
		Items: items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}

func (s *SampleService) CreateItem(ctx context.Context, input CreateSampleItemInput) (model.SampleItem, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return model.SampleItem{}, ErrSampleNameRequired
	}

	return s.repo.CreateItem(ctx, model.SampleItem{
		Name:        name,
		Description: strings.TrimSpace(input.Description),
	})
}

func (s *SampleService) UpdateItem(ctx context.Context, id uint, input UpdateSampleItemInput) (model.SampleItem, error) {
	if id == 0 {
		return model.SampleItem{}, ErrSampleItemNotFound
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return model.SampleItem{}, ErrSampleNameRequired
	}

	item, err := s.repo.UpdateItem(ctx, id, model.SampleItem{
		Name:        name,
		Description: strings.TrimSpace(input.Description),
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.SampleItem{}, ErrSampleItemNotFound
		}
		return model.SampleItem{}, err
	}
	return item, nil
}

func (s *SampleService) DeleteItem(ctx context.Context, id uint) error {
	if id == 0 {
		return ErrSampleItemNotFound
	}

	err := s.repo.DeleteItem(ctx, id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrSampleItemNotFound
		}
		return err
	}
	return nil
}

func normalizePagination(page int, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 200 {
		limit = 200
	}
	return page, limit
}
