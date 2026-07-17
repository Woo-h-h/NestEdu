package http

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-org/mvp-template/apps/api/internal/service"
)

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
		// 避免把本地 Host 传给平台
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

	r.Any("/api/knowledge", handler)
	r.Any("/api/knowledge/*filepath", handler)
	r.Any("/v1", handler)
	r.Any("/v1/*filepath", handler)
}

func escapeJSON(s string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`, "\r", `\r`)
	return replacer.Replace(s)
}
