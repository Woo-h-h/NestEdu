package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

// profileActionHandler 教师画像行动计划 HTTP 入口。
type profileActionHandler struct {
	service *service.ProfileActionService
}

func newProfileActionHandler(svc *service.ProfileActionService) *profileActionHandler {
	return &profileActionHandler{service: svc}
}

func (h *profileActionHandler) registerRoutes(api *gin.RouterGroup) {
	group := api.Group("/profile-actions")
	group.GET("", h.get)
	group.PUT("", h.replace)
	group.PATCH("/:id", h.patch)
}

func (h *profileActionHandler) get(c *gin.Context) {
	payload, err := h.service.Get(c.Request.Context(), resolveOwnerID(c))
	if err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, payload)
}

func (h *profileActionHandler) replace(c *gin.Context) {
	var body struct {
		States map[string]model.ProfileActionState `json:"states"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}
	payload, err := h.service.Replace(c.Request.Context(), resolveOwnerID(c), body.States)
	if err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, payload)
}

func (h *profileActionHandler) patch(c *gin.Context) {
	var body model.ProfileActionPatchPayload
	if err := c.ShouldBindJSON(&body); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}
	body.ID = strings.TrimSpace(c.Param("id"))
	payload, err := h.service.Patch(c.Request.Context(), resolveOwnerID(c), body)
	if err != nil {
		h.writeErr(c, err)
		return
	}
	jsonResult(c, http.StatusOK, payload)
}

func (h *profileActionHandler) writeErr(c *gin.Context, err error) {
	switch {
	case errors.Is(err, service.ErrOwnerRequired),
		errors.Is(err, service.ErrProfileActionIDRequired):
		jsonErr(c, http.StatusBadRequest, err)
	default:
		jsonErr(c, http.StatusInternalServerError, err)
	}
}
