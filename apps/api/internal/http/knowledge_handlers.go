package http

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/model"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

// knowledgeHandler 知识库 HTTP 入口：只做绑参、转发鉴权头、调用 KnowledgeService。
// 分类纠正与平台字段映射在 service 层完成。
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
	group.DELETE("/documents/:id", h.deleteDocument)
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
		CategoryID:  strings.TrimSpace(c.Query("categoryId")),
		CategoryKey: strings.TrimSpace(c.Query("categoryKey")),
		Page:        parseIntDefault(c.Query("page"), 1),
		Limit:       parseIntDefault(c.Query("limit"), 50),
	})
	if err != nil {
		if strings.Contains(err.Error(), "knowledgeId is required") {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		msg := err.Error()
		if strings.Contains(msg, "token") || strings.Contains(msg, "401") || strings.Contains(msg, "cookie") {
			jsonErr(c, http.StatusUnauthorized, fmt.Errorf("请先登录平台后加载知识库"))
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

func (h *knowledgeHandler) deleteDocument(c *gin.Context) {
	headers := forwardPlatformHeaders(c)
	if strings.TrimSpace(headers["Authorization"]) == "" {
		jsonErr(c, http.StatusUnauthorized, fmt.Errorf("请先登录平台后再删除"))
		return
	}
	if err := h.service.DeleteDocument(c.Request.Context(), headers, c.Param("id")); err != nil {
		msg := err.Error()
		if strings.Contains(msg, "required") {
			jsonErr(c, http.StatusBadRequest, err)
			return
		}
		jsonErr(c, http.StatusBadGateway, err)
		return
	}
	jsonResult(c, http.StatusOK, gin.H{"deleted": true})
}

// forwardPlatformHeaders 从请求中取出需透传给 AI101 的鉴权与客户端头。
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
	return headers
}
