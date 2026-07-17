package http

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

type knowledgeHandler struct {
	service *service.KnowledgeService
}

func newKnowledgeHandler(service *service.KnowledgeService) *knowledgeHandler {
	return &knowledgeHandler{service: service}
}

func (h *knowledgeHandler) registerRoutes(api *gin.RouterGroup) {
	group := api.Group("/knowledge")
	group.GET("/plans", h.listPlans)
	group.GET("/plans/:id", h.getPlan)
	group.POST("/documents", h.uploadDocument)
}

func (h *knowledgeHandler) uploadDocument(c *gin.Context) {
	var input service.UploadDocumentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		jsonErr(c, http.StatusBadRequest, err)
		return
	}

	headers := forwardPlatformHeaders(c)
	if strings.TrimSpace(headers["Authorization"]) == "" {
		jsonErr(c, http.StatusUnauthorized, fmt.Errorf("请先登录平台后再上传"))
		return
	}

	plan, err := h.service.UploadDocument(c.Request.Context(), headers, input)
	if err != nil {
		msg := err.Error()
		if strings.Contains(msg, "required") || strings.Contains(msg, "too large") {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusBadGateway, err)
		return
	}
	jsonResult(c, http.StatusOK, plan)
}

func (h *knowledgeHandler) listPlans(c *gin.Context) {
	result, err := h.service.ListPlans(c.Request.Context(), forwardPlatformHeaders(c), model.ListKnowledgePlansParams{
		Keyword:     strings.TrimSpace(c.Query("keyword")),
		KnowledgeID: strings.TrimSpace(c.Query("knowledgeId")),
		Page:        parseIntDefault(c.Query("page"), 1),
		Limit:       parseIntDefault(c.Query("limit"), 50),
	})
	if err != nil {
		if strings.Contains(err.Error(), "knowledgeId is required") {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusBadGateway, err)
		return
	}
	jsonResult(c, http.StatusOK, result.Items, gin.H{
		"total":  result.Total,
		"page":   result.Page,
		"limit":  result.Limit,
		"source": result.Source,
	})
}

func (h *knowledgeHandler) getPlan(c *gin.Context) {
	plan, err := h.service.GetPlan(c.Request.Context(), forwardPlatformHeaders(c), c.Param("id"))
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			jsonErr(c, http.StatusNotFound, err)
			return
		}
		jsonErr(c, http.StatusBadGateway, err)
		return
	}
	jsonResult(c, http.StatusOK, plan)
}

func forwardPlatformHeaders(c *gin.Context) service.ForwardHeaders {
	headers := service.ForwardHeaders{}
	for _, key := range []string{
		"Authorization",
		"X-Bid",
		"X-Mvp",
		"X-Uid-Hash",
		"X-Uid",
		"X-Host",
		"X-Request-Id",
		"Cookie",
	} {
		if value := strings.TrimSpace(c.GetHeader(key)); value != "" {
			headers[key] = value
		}
	}
	if _, ok := headers["Authorization"]; !ok {
		return headers
	}
	return headers
}
