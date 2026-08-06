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
	payload, err := h.service.GetByPhone(c.Request.Context(), phone)
	if err != nil {
		if errors.Is(err, service.ErrProfileNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		if errors.Is(err, service.ErrProfilePhoneRequired) || errors.Is(err, service.ErrProfilePhoneInvalid) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
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
		if errors.Is(err, service.ErrProfilePhoneRequired) ||
			errors.Is(err, service.ErrProfilePhoneInvalid) ||
			errors.Is(err, service.ErrProfileMarkdownRequired) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, saved)
}

func (h *profileSnapshotHandler) deleteByPhone(c *gin.Context) {
	phone := strings.TrimSpace(c.Query("phone"))
	if err := h.service.DeleteByPhone(c.Request.Context(), phone); err != nil {
		if errors.Is(err, service.ErrProfileNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		if errors.Is(err, service.ErrProfilePhoneRequired) || errors.Is(err, service.ErrProfilePhoneInvalid) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, gin.H{"deleted": true})
}
