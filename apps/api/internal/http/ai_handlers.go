package http

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

// aiHandler 智能体生成相关 HTTP 入口（周计划 / 活动方案），业务在 LLMService。
type aiHandler struct {
	llm *service.LLMService
}

func newAIHandler(llm *service.LLMService) *aiHandler {
	return &aiHandler{llm: llm}
}

func (h *aiHandler) registerRoutes(api *gin.RouterGroup) {
	weekly := api.Group("/ai/weekly-plan")
	weekly.POST("/generate", h.generateWeeklyPlan)
	weekly.POST("/modify", h.modifyWeeklyPlan)

	teaching := api.Group("/ai/teaching-plans")
	teaching.POST("/generate", h.generateTeachingPlans)
}

func (h *aiHandler) generateTeachingPlans(c *gin.Context) {
	var input service.GenerateTeachingPlansInput
	if err := c.ShouldBindJSON(&input); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}

	plans, err := h.llm.GenerateTeachingPlans(c.Request.Context(), forwardPlatformHeaders(c), input)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "登录") || strings.Contains(msg, "token") || strings.Contains(msg, "401") {
			jsonErr(c, http.StatusUnauthorized, err)
			return
		}
		jsonErr(c, http.StatusBadGateway, err)
		return
	}
	jsonResult(c, http.StatusOK, plans)
}

func (h *aiHandler) generateWeeklyPlan(c *gin.Context) {
	var input service.GenerateWeeklyPlanInput
	if err := c.ShouldBindJSON(&input); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}

	plan, err := h.llm.GenerateWeeklyPlan(c.Request.Context(), forwardPlatformHeaders(c), input)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "登录") || strings.Contains(msg, "token") || strings.Contains(msg, "401") {
			jsonErr(c, http.StatusUnauthorized, err)
			return
		}
		jsonErr(c, http.StatusBadGateway, err)
		return
	}
	jsonResult(c, http.StatusOK, plan)
}

func (h *aiHandler) modifyWeeklyPlan(c *gin.Context) {
	var input service.ModifyWeeklyPlanInput
	if err := c.ShouldBindJSON(&input); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}

	result, err := h.llm.ModifyWeeklyPlan(c.Request.Context(), forwardPlatformHeaders(c), input)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "登录") || strings.Contains(msg, "token") || strings.Contains(msg, "401") {
			jsonErr(c, http.StatusUnauthorized, err)
			return
		}
		jsonErr(c, http.StatusBadGateway, err)
		return
	}
	jsonResult(c, http.StatusOK, result)
}
