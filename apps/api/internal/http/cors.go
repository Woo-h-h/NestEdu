package http

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func parseOriginAllowlist(raw string) map[string]struct{} {
	out := make(map[string]struct{})
	for _, part := range strings.Split(raw, ",") {
		origin := strings.TrimSpace(part)
		if origin == "" {
			continue
		}
		out[origin] = struct{}{}
	}
	return out
}

func originAllowed(origin string, allowlist map[string]struct{}) bool {
	if len(allowlist) == 0 {
		return false
	}
	if _, ok := allowlist["*"]; ok {
		// 显式 * 才放开（仍不推荐生产开启）
		return true
	}
	_, ok := allowlist[origin]
	return ok
}

// cors 按白名单反射 Origin；白名单为空时不写 ACAO（仅适合同域部署）。
// allowlist 逗号分隔，例如：https://nest.zcat.cn,http://localhost:3005
func cors(allowlist string) gin.HandlerFunc {
	allowed := parseOriginAllowlist(allowlist)
	return func(c *gin.Context) {
		origin := strings.TrimSpace(c.GetHeader("Origin"))
		if origin != "" && originAllowed(origin, allowed) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin")
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, Authorization, X-CSRF-Token, X-Request-ID, X-Bid, X-Mvp, X-Uid-Hash, X-Uid, X-Host")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
