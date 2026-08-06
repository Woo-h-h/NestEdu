package http

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

var (
	platformProxyMu      sync.RWMutex
	platformProxyHandler gin.HandlerFunc
)

func getPlatformProxyHandler() gin.HandlerFunc {
	platformProxyMu.RLock()
	defer platformProxyMu.RUnlock()
	return platformProxyHandler
}

// registerPlatformProxy 将平台直连路径反代到 api.zcat.cn。
// 生产环境前后端同域时，前端仍请求 /api/knowledge、/v1，由本服务转发。
func registerPlatformProxy(r *gin.Engine, cfg service.PlatformClientConfig) {
	baseURL := strings.TrimRight(strings.TrimSpace(cfg.BaseURL), "/")
	if baseURL == "" {
		baseURL = "https://api.zcat.cn"
	}
	target, err := url.Parse(baseURL)
	if err != nil {
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.Host = target.Host
		if referer := strings.TrimSpace(cfg.Referer); referer != "" {
			req.Header.Set("Referer", referer)
		}
		req.Header.Del("X-Forwarded-Host")
	}
	proxy.ErrorHandler = func(w http.ResponseWriter, _ *http.Request, err error) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`{"success":false,"errorMessage":"platform proxy failed: ` + escapeJSON(err.Error()) + `"}`))
	}

	handler := func(c *gin.Context) {
		proxy.ServeHTTP(c.Writer, c.Request)
		c.Abort()
	}

	platformProxyMu.Lock()
	platformProxyHandler = handler
	platformProxyMu.Unlock()

	// 用中间件前缀匹配，避免 Gin 通配路由在部分路径下未命中
	r.Use(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api/knowledge") ||
			strings.HasPrefix(path, "/api/user") ||
			strings.HasPrefix(path, "/api/file") ||
			path == "/v1" ||
			strings.HasPrefix(path, "/v1/") {
			handler(c)
			return
		}
		c.Next()
	})
}

func escapeJSON(s string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`, "\r", `\r`)
	return replacer.Replace(s)
}
