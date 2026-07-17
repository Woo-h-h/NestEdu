package service

import (
	"context"
	"errors"
	"testing"

	"github.com/your-org/mvp-template/apps/api/internal/model"
)

type fakeSampleRepository struct {
	listPage  int
	listLimit int
	created   model.SampleItem
	updatedID uint
	updated   model.SampleItem
	deletedID uint
}

func (r *fakeSampleRepository) ListItems(ctx context.Context, page int, limit int) ([]model.SampleItem, int64, error) {
	r.listPage = page
	r.listLimit = limit
	return []model.SampleItem{{ID: 1, Name: "Alpha"}}, 1, nil
}

func (r *fakeSampleRepository) CreateItem(ctx context.Context, item model.SampleItem) (model.SampleItem, error) {
	r.created = item
	item.ID = 10
	return item, nil
}

func (r *fakeSampleRepository) UpdateItem(ctx context.Context, id uint, item model.SampleItem) (model.SampleItem, error) {
	if id != 1 {
		return model.SampleItem{}, ErrSampleItemNotFound
	}
	r.updatedID = id
	r.updated = item
	item.ID = id
	return item, nil
}

func (r *fakeSampleRepository) DeleteItem(ctx context.Context, id uint) error {
	if id != 1 {
		return ErrSampleItemNotFound
	}
	r.deletedID = id
	return nil
}

func TestSampleServiceListItemsNormalizesPagination(t *testing.T) {
	repo := &fakeSampleRepository{}
	svc := NewSampleService(repo)

	result, err := svc.ListItems(context.Background(), ListSampleItemsParams{
		Page:  -1,
		Limit: 500,
	})
	if err != nil {
		t.Fatalf("ListItems returned error: %v", err)
	}

	if repo.listPage != 1 || repo.listLimit != 200 {
		t.Fatalf("expected normalized pagination 1/200, got %d/%d", repo.listPage, repo.listLimit)
	}
	if result.Page != 1 || result.Limit != 200 || result.Total != 1 {
		t.Fatalf("unexpected result metadata: %+v", result)
	}
}

func TestSampleServiceCreateItemTrimsInput(t *testing.T) {
	repo := &fakeSampleRepository{}
	svc := NewSampleService(repo)

	item, err := svc.CreateItem(context.Background(), CreateSampleItemInput{
		Name:        "  Alpha  ",
		Description: "  First item  ",
	})
	if err != nil {
		t.Fatalf("CreateItem returned error: %v", err)
	}

	if item.ID != 10 || repo.created.Name != "Alpha" || repo.created.Description != "First item" {
		t.Fatalf("unexpected created item: item=%+v repo=%+v", item, repo.created)
	}
}

func TestSampleServiceCreateItemRequiresName(t *testing.T) {
	repo := &fakeSampleRepository{}
	svc := NewSampleService(repo)

	_, err := svc.CreateItem(context.Background(), CreateSampleItemInput{Name: "   "})
	if !errors.Is(err, ErrSampleNameRequired) {
		t.Fatalf("expected ErrSampleNameRequired, got %v", err)
	}
}

func TestSampleServiceUpdateItemTrimsInput(t *testing.T) {
	repo := &fakeSampleRepository{}
	svc := NewSampleService(repo)

	item, err := svc.UpdateItem(context.Background(), 1, UpdateSampleItemInput{
		Name:        "  Beta  ",
		Description: "  Updated  ",
	})
	if err != nil {
		t.Fatalf("UpdateItem returned error: %v", err)
	}

	if item.ID != 1 || repo.updated.Name != "Beta" || repo.updated.Description != "Updated" {
		t.Fatalf("unexpected updated item: item=%+v repo=%+v", item, repo.updated)
	}
}

func TestSampleServiceUpdateItemNotFound(t *testing.T) {
	repo := &fakeSampleRepository{}
	svc := NewSampleService(repo)

	_, err := svc.UpdateItem(context.Background(), 99, UpdateSampleItemInput{Name: "Beta"})
	if !errors.Is(err, ErrSampleItemNotFound) {
		t.Fatalf("expected ErrSampleItemNotFound, got %v", err)
	}
}

func TestSampleServiceDeleteItem(t *testing.T) {
	repo := &fakeSampleRepository{}
	svc := NewSampleService(repo)

	if err := svc.DeleteItem(context.Background(), 1); err != nil {
		t.Fatalf("DeleteItem returned error: %v", err)
	}
	if repo.deletedID != 1 {
		t.Fatalf("expected deleted id 1, got %d", repo.deletedID)
	}
}

func TestSampleServiceDeleteItemNotFound(t *testing.T) {
	repo := &fakeSampleRepository{}
	svc := NewSampleService(repo)

	if err := svc.DeleteItem(context.Background(), 99); !errors.Is(err, ErrSampleItemNotFound) {
		t.Fatalf("expected ErrSampleItemNotFound, got %v", err)
	}
}
