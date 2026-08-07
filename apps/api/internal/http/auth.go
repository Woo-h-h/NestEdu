package http

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

var (
	errLoginRequired = errors.New("请先登录平台后再操作")
	errOwnerRequired = errors.New("缺少用户标识（X-Uid-Hash），请重新登录")
)

// peekOwnerID 从鉴权相关请求头解析归属用户，不做 JWT 验签（平台 Token 由上游校验）。
func peekOwnerID(c *gin.Context) string {
	for _, header := range []string{"X-Uid-Hash", "X-Uid", "X-User-Id"} {
		if value := strings.TrimSpace(c.GetHeader(header)); value != "" {
			return value
		}
	}
	return ""
}

// requireAPISession 要求携带 Authorization 与用户标识，禁止 anonymous 归属。
func requireAPISession() gin.HandlerFunc {
	return func(c *gin.Context) {
		if strings.TrimSpace(c.GetHeader("Authorization")) == "" {
			jsonErr(c, http.StatusUnauthorized, errLoginRequired)
			c.Abort()
			return
		}
		owner := peekOwnerID(c)
		if owner == "" {
			jsonErr(c, http.StatusUnauthorized, errOwnerRequired)
			c.Abort()
			return
		}
		c.Set("ownerID", owner)
		c.Next()
	}
}

// resolveOwnerID 读取会话归属；须在 requireAPISession 之后使用。
func resolveOwnerID(c *gin.Context) string {
	if v, ok := c.Get("ownerID"); ok {
		if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
			return strings.TrimSpace(s)
		}
	}
	return peekOwnerID(c)
}
