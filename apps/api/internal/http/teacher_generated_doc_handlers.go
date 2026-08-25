package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

// teacherGeneratedDocHandler 本人教案/周计划入库计数映射的 HTTP 入口。
type teacherGeneratedDocHandler struct {
	service *service.TeacherGeneratedDocService
}

func newTeacherGeneratedDocHandler(svc *service.TeacherGeneratedDocService) *teacherGeneratedDocHandler {
	return &teacherGeneratedDocHandler{service: svc}
}

func (h *teacherGeneratedDocHandler) registerRoutes(api *gin.RouterGroup) {
	group := api.Group("/teacher-generated-docs")
	group.GET("/stats", h.stats)
	group.GET("", h.list)
	group.POST("", h.save)
	group.DELETE("/:knowledgeDocId", h.deleteByKnowledgeDocID)
}

func (h *teacherGeneratedDocHandler) stats(c *gin.Context) {
	stats, err := h.service.Stats(c.Request.Context(), resolveOwnerID(c), strings.TrimSpace(c.Query("phone")))
	if err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, stats)
}

func (h *teacherGeneratedDocHandler) list(c *gin.Context) {
	limit := parseIntDefault(c.Query("limit"), 100)
	page := parseIntDefault(c.Query("page"), 1)
	rows, err := h.service.List(
		c.Request.Context(),
		resolveOwnerID(c),
		strings.TrimSpace(c.Query("phone")),
		strings.TrimSpace(c.Query("docType")),
		page,
		limit,
	)
	if err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, rows)
}

func (h *teacherGeneratedDocHandler) save(c *gin.Context) {
	var payload model.TeacherGeneratedDocPayload
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

func (h *teacherGeneratedDocHandler) deleteByKnowledgeDocID(c *gin.Context) {
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

func (h *teacherGeneratedDocHandler) writeErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrGeneratedDocNotFound):
		jsonErr(c, http.StatusNotFound, err)
	case errors.Is(err, service.ErrGeneratedDocForbidden):
		jsonErr(c, http.StatusForbidden, err)
	case errors.Is(err, service.ErrGeneratedDocPhoneRequired),
		errors.Is(err, service.ErrGeneratedDocPhoneInvalid),
		errors.Is(err, service.ErrGeneratedDocTypeInvalid),
		errors.Is(err, service.ErrGeneratedDocTitleRequired),
		errors.Is(err, service.ErrGeneratedDocIDRequired),
		errors.Is(err, service.ErrGeneratedDocStorageInvalid),
		errors.Is(err, service.ErrGeneratedDocContentRequired),
		errors.Is(err, service.ErrGeneratedDocYearInvalid),
		errors.Is(err, service.ErrOwnerRequired):
		jsonErr(c, http.StatusBadRequest, err)
	default:
		jsonErr(c, http.StatusInternalServerError, err)
	}
}
