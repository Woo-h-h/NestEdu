package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

// sampleHandler 模板样例 CRUD 的 HTTP 入口（非核心业务）。
type sampleHandler struct {
	service *service.SampleService
}

type createSampleItemRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func newSampleHandler(service *service.SampleService) *sampleHandler {
	return &sampleHandler{service: service}
}

func (h *sampleHandler) registerRoutes(api *gin.RouterGroup) {
	sample := api.Group("/sample")
	sample.GET("/items", h.listItems)
	sample.POST("/items", h.createItem)
	sample.PUT("/items/:id", h.updateItem)
	sample.DELETE("/items/:id", h.deleteItem)
}

func (h *sampleHandler) listItems(c *gin.Context) {
	result, err := h.service.ListItems(c.Request.Context(), service.ListSampleItemsParams{
		Page:  parseIntDefault(c.Query("page"), 1),
		Limit: parseIntDefault(c.Query("limit"), 20),
	})
	if err != nil {
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}

	jsonResult(c, http.StatusOK, result.Items, gin.H{
		"total": result.Total,
		"page":  result.Page,
		"limit": result.Limit,
	})
}

func (h *sampleHandler) createItem(c *gin.Context) {
	var req createSampleItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}

	item, err := h.service.CreateItem(c.Request.Context(), service.CreateSampleItemInput{
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		if errors.Is(err, service.ErrSampleNameRequired) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}

	jsonResult(c, http.StatusOK, item)
}

func (h *sampleHandler) updateItem(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		jsonErr(c, http.StatusBadRequest, errors.New("invalid id"))
		return
	}

	var req createSampleItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}

	item, err := h.service.UpdateItem(c.Request.Context(), id, service.UpdateSampleItemInput{
		Name:        req.Name,
		Description: req.Description,
	})
	if err != nil {
		if errors.Is(err, service.ErrSampleNameRequired) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		if errors.Is(err, service.ErrSampleItemNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}

	jsonResult(c, http.StatusOK, item)
}

func (h *sampleHandler) deleteItem(c *gin.Context) {
	id, ok := parseUintParam(c, "id")
	if !ok {
		jsonErr(c, http.StatusBadRequest, errors.New("invalid id"))
		return
	}

	if err := h.service.DeleteItem(c.Request.Context(), id); err != nil {
		if errors.Is(err, service.ErrSampleItemNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}

	jsonResult(c, http.StatusOK, gin.H{"deleted": true})
}

func parseUintParam(c *gin.Context, name string) (uint, bool) {
	raw := strings.TrimSpace(c.Param(name))
	if raw == "" {
		return 0, false
	}
	n, err := strconv.ParseUint(raw, 10, 64)
	if err != nil || n == 0 {
		return 0, false
	}
	return uint(n), true
}

func parseIntDefault(raw string, fallback int) int {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fallback
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return n
}
