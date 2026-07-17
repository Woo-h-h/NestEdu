package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

type weeklyPlanHandler struct {
	service *service.WeeklyPlanService
}

func newWeeklyPlanHandler(service *service.WeeklyPlanService) *weeklyPlanHandler {
	return &weeklyPlanHandler{service: service}
}

func (h *weeklyPlanHandler) registerRoutes(api *gin.RouterGroup) {
	group := api.Group("/weekly-plans")
	group.GET("", h.listPlans)
	group.GET("/:id", h.getPlan)
	group.POST("", h.savePlan)
	group.PUT("/:id", h.savePlanByID)
	group.DELETE("/:id", h.deletePlan)
}

func (h *weeklyPlanHandler) listPlans(c *gin.Context) {
	plans, err := h.service.ListPlans(c.Request.Context(), resolveOwnerID(c))
	if err != nil {
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, plans)
}

func (h *weeklyPlanHandler) getPlan(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	plan, err := h.service.GetPlan(c.Request.Context(), resolveOwnerID(c), id)
	if err != nil {
		if errors.Is(err, service.ErrWeeklyPlanNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, plan)
}

func (h *weeklyPlanHandler) savePlan(c *gin.Context) {
	var payload model.WeeklyPlanPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}
	plan, err := h.service.SavePlan(c.Request.Context(), resolveOwnerID(c), payload)
	if err != nil {
		if errors.Is(err, service.ErrWeeklyPlanIDRequired) || errors.Is(err, service.ErrWeeklyPlanThemeRequired) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, plan)
}

func (h *weeklyPlanHandler) savePlanByID(c *gin.Context) {
	var payload model.WeeklyPlanPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}
	payload.ID = strings.TrimSpace(c.Param("id"))
	plan, err := h.service.SavePlan(c.Request.Context(), resolveOwnerID(c), payload)
	if err != nil {
		if errors.Is(err, service.ErrWeeklyPlanNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		if errors.Is(err, service.ErrWeeklyPlanIDRequired) || errors.Is(err, service.ErrWeeklyPlanThemeRequired) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, plan)
}

func (h *weeklyPlanHandler) deletePlan(c *gin.Context) {
	id := strings.TrimSpace(c.Param("id"))
	if err := h.service.DeletePlan(c.Request.Context(), resolveOwnerID(c), id); err != nil {
		if errors.Is(err, service.ErrWeeklyPlanNotFound) {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		if errors.Is(err, service.ErrWeeklyPlanIDRequired) {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusInternalServerError, err)
		return
	}
	jsonResult(c, http.StatusOK, gin.H{"deleted": true})
}

func resolveOwnerID(c *gin.Context) string {
	for _, header := range []string{"X-Uid-Hash", "X-Uid", "X-User-Id"} {
		if value := strings.TrimSpace(c.GetHeader(header)); value != "" {
			return value
		}
	}
	return "anonymous"
}
