package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

type archiveAchievementHandler struct {
	service *service.ArchiveAchievementService
}

func newArchiveAchievementHandler(svc *service.ArchiveAchievementService) *archiveAchievementHandler {
	return &archiveAchievementHandler{service: svc}
}

func (h *archiveAchievementHandler) registerRoutes(api *gin.RouterGroup) {
	group := api.Group("/archive-achievements")
	group.GET("", h.list)
	group.POST("", h.save)
	group.DELETE("/:knowledgeDocId", h.deleteByKnowledgeDocID)
}

func (h *archiveAchievementHandler) list(c *gin.Context) {
	limit := parseIntDefault(c.Query("limit"), 100)
	page := parseIntDefault(c.Query("page"), 1)
	rows, err := h.service.List(
		c.Request.Context(),
		resolveOwnerID(c),
		strings.TrimSpace(c.Query("phone")),
		page,
		limit,
	)
	if err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, rows)
}

func (h *archiveAchievementHandler) save(c *gin.Context) {
	var payload model.ArchiveAchievementPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}
	saved, err := h.service.Save(c.Request.Context(), resolveOwnerID(c), payload)
	if err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, saved)
}

func (h *archiveAchievementHandler) deleteByKnowledgeDocID(c *gin.Context) {
	if err := h.service.DeleteByKnowledgeDocID(
		c.Request.Context(),
		resolveOwnerID(c),
		c.Param("knowledgeDocId"),
	); err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, gin.H{"deleted": true})
}

func (h *archiveAchievementHandler) writeErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrArchiveAchievementNotFound):
		jsonErr(c, http.StatusNotFound, err)
	case errors.Is(err, service.ErrArchiveAchievementForbidden):
		jsonErr(c, http.StatusForbidden, err)
	case errors.Is(err, service.ErrArchiveAchievementIDRequired),
		errors.Is(err, service.ErrArchiveAchievementTitleRequired),
        errors.Is(err, service.ErrArchiveAchievementYearInvalid),
		errors.Is(err, service.ErrProfilePhoneRequired),
		errors.Is(err, service.ErrProfilePhoneInvalid),
		errors.Is(err, service.ErrOwnerRequired):
		jsonErr(c, http.StatusBadRequest, err)
	default:
		jsonErr(c, http.StatusInternalServerError, err)
	}
}
