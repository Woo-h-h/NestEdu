package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

// profileSnapshotHandler 教师画像快照的 HTTP 入口。
type profileSnapshotHandler struct {
	service *service.ProfileSnapshotService
}

func newProfileSnapshotHandler(svc *service.ProfileSnapshotService) *profileSnapshotHandler {
	return &profileSnapshotHandler{service: svc}
}

func (h *profileSnapshotHandler) registerRoutes(api *gin.RouterGroup) {
	group := api.Group("/profile-snapshots")
	group.GET("", h.getByPhone)
	group.POST("", h.save)
	group.DELETE("", h.deleteByPhone)
}

func (h *profileSnapshotHandler) getByPhone(c *gin.Context) {
	phone := strings.TrimSpace(c.Query("phone"))
	payload, err := h.service.GetByPhone(c.Request.Context(), resolveOwnerID(c), phone)
	if err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, payload)
}

func (h *profileSnapshotHandler) save(c *gin.Context) {
	var payload model.ProfileSnapshotPayload
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

func (h *profileSnapshotHandler) deleteByPhone(c *gin.Context) {
	phone := strings.TrimSpace(c.Query("phone"))
	if err := h.service.DeleteByPhone(c.Request.Context(), resolveOwnerID(c), phone); err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, gin.H{"deleted": true})
}

func (h *profileSnapshotHandler) writeErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrProfileNotFound):
		jsonErr(c, http.StatusNotFound, err)
	case errors.Is(err, service.ErrProfileForbidden):
		jsonErr(c, http.StatusForbidden, err)
	case errors.Is(err, service.ErrProfilePhoneRequired),
		errors.Is(err, service.ErrProfilePhoneInvalid),
		errors.Is(err, service.ErrProfileMarkdownRequired),
		errors.Is(err, service.ErrOwnerRequired):
		jsonErr(c, http.StatusBadRequest, err)
	default:
		jsonErr(c, http.StatusInternalServerError, err)
	}
}
