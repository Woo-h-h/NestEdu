package http

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"

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
	proxy.FlushInterval = -1 // 智能体 SSE 需立即刷出，避免成果解析一直空等
	proxy.Transport = &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		ResponseHeaderTimeout: 120 * time.Second,
		IdleConnTimeout:       90 * time.Second,
	}
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
		if isPlatformProxyPath(c.Request.URL.Path) {
			handler(c)
			return
		}
		c.Next()
	})
}

// isPlatformProxyPath 判断是否应反代到平台（知识库 / 文件 / 用户 / 智能体对话 / 开放 API）。
func isPlatformProxyPath(path string) bool {
	return strings.HasPrefix(path, "/api/knowledge") ||
		strings.HasPrefix(path, "/api/user") ||
		strings.HasPrefix(path, "/api/file") ||
		strings.HasPrefix(path, "/api/ai") ||
		path == "/v1" ||
		strings.HasPrefix(path, "/v1/")
}

func escapeJSON(s string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`, "\r", `\r`)
	return replacer.Replace(s)
}
