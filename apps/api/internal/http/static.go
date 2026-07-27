package http

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

func registerWebStatic(r *gin.Engine, dir, basePath string) {
	dir = strings.TrimSpace(dir)
	if dir == "" {
		return
	}

	indexPath := filepath.Join(dir, "index.html")
	if _, err := os.Stat(indexPath); err != nil {
		return
	}

	serveIndex := func(c *gin.Context) {
		c.File(indexPath)
	}

	assetsPath := "/assets"
	faviconPath := "/favicon.ico"
	if basePath != "" {
		assetsPath = basePath + "/assets"
		faviconPath = basePath + "/favicon.ico"
		r.GET(basePath, serveIndex)
		r.GET(basePath+"/", serveIndex)
	}

	if exists(filepath.Join(dir, "assets")) {
		r.Static(assetsPath, filepath.Join(dir, "assets"))
	}
	if exists(filepath.Join(dir, "favicon.ico")) {
		r.StaticFile(faviconPath, filepath.Join(dir, "favicon.ico"))
	}

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		// 兜底：未匹配到显式反代路由时，仍转发平台路径，避免「api route not found」
		if strings.HasPrefix(path, "/api/knowledge") || strings.HasPrefix(path, "/api/user") || path == "/v1" || strings.HasPrefix(path, "/v1/") {
			if proxy := getPlatformProxyHandler(); proxy != nil {
				proxy(c)
				return
			}
		}
		if strings.HasPrefix(path, "/api") {
			jsonErr(c, http.StatusNotFound, errors.New("api route not found"))
			return
		}
		if basePath != "" && !isUnderBasePath(path, basePath) {
			jsonErr(c, http.StatusNotFound, errors.New("route not found"))
			return
		}
		if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
			jsonErr(c, http.StatusNotFound, errors.New("route not found"))
			return
		}
		serveIndex(c)
	})
}

func isUnderBasePath(path, basePath string) bool {
	return path == basePath || strings.HasPrefix(path, basePath+"/")
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
