package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/service"
	"github.com/your-org/mvp-template/apps/api/internal/store"
)

type growthHandler struct {
	service *service.GrowthService
}

func newGrowthHandler(service *service.GrowthService) *growthHandler {
	return &growthHandler{service: service}
}

func (h *growthHandler) registerRoutes(api *gin.RouterGroup) {
	group := api.Group("/growth-records")
	group.GET("", h.listRecords)
	group.GET("/:id", h.getRecord)
	group.POST("", h.saveRecord)
	group.PUT("/:id", h.saveRecordByID)
	group.DELETE("/:id", h.deleteRecord)
}

func (h *growthHandler) listRecords(c *gin.Context) {
	filter := store.GrowthListFilter{
		Category: strings.TrimSpace(c.Query("category")),
		Level:    strings.TrimSpace(c.Query("level")),
		Status:   strings.TrimSpace(c.Query("status")),
		Keyword:  strings.TrimSpace(c.Query("keyword")),
	}
	if yearRaw := strings.TrimSpace(c.Query("year")); yearRaw != "" {
		year, err := strconv.Atoi(yearRaw)
		if err != nil {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		filter.Year = &year
	}

	records, err := h.service.ListRecords(c.Request.Context(), resolveOwnerID(c), filter)
	if err != nil {
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, records)
}

func (h *growthHandler) getRecord(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	record, err := h.service.GetRecord(c.Request.Context(), resolveOwnerID(c), id)
	if err != nil {
		if errors.Is(err, service.ErrGrowthNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, record)
}

func (h *growthHandler) saveRecord(c *gin.Context) {
	var payload model.GrowthRecordPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}
	record, err := h.service.SaveRecord(c.Request.Context(), resolveOwnerID(c), payload)
	if err != nil {
		if errors.Is(err, service.ErrGrowthIDRequired) ||
			errors.Is(err, service.ErrGrowthNameRequired) ||
			errors.Is(err, service.ErrGrowthCategoryRequired) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, record)
}

func (h *growthHandler) saveRecordByID(c *gin.Context) {
	var payload model.GrowthRecordPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}
	payload.ID = strings.TrimSpace(c.Param("id"))
	record, err := h.service.SaveRecord(c.Request.Context(), resolveOwnerID(c), payload)
	if err != nil {
		if errors.Is(err, service.ErrGrowthNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		if errors.Is(err, service.ErrGrowthIDRequired) ||
			errors.Is(err, service.ErrGrowthNameRequired) ||
			errors.Is(err, service.ErrGrowthCategoryRequired) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, record)
}

func (h *growthHandler) deleteRecord(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if err := h.service.DeleteRecord(c.Request.Context(), resolveOwnerID(c), id); err != nil {
		if errors.Is(err, service.ErrGrowthNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		if errors.Is(err, service.ErrGrowthIDRequired) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, gin.H{"deleted": true})
}
