package http

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

// registerWebStatic 生产环境由 Go 托管前端构建产物（SPA fallback 到 index.html）。
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
		// index.html 必须每次向服务器确认，避免部署后仍用旧入口引用已删除的 /assets/*.js
		c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
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

	// hashed 静态资源可长期缓存；路径含内容 hash，部署换文件名即可
	if exists(filepath.Join(dir, "assets")) {
		assetRoot := assetsPath
		r.Use(func(c *gin.Context) {
			p := c.Request.URL.Path
			if p == assetRoot || strings.HasPrefix(p, assetRoot+"/") {
				c.Header("Cache-Control", "public, max-age=31536000, immutable")
			}
			c.Next()
		})
		r.Static(assetsPath, filepath.Join(dir, "assets"))
	}
	if exists(filepath.Join(dir, "favicon.ico")) {
		r.StaticFile(faviconPath, filepath.Join(dir, "favicon.ico"))
	}

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		// 兜底：未匹配到显式反代路由时，仍转发平台路径，避免「api route not found」
		if strings.HasPrefix(path, "/api/knowledge") || strings.HasPrefix(path, "/api/user") || strings.HasPrefix(path, "/api/file") || path == "/v1" || strings.HasPrefix(path, "/v1/") {
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
