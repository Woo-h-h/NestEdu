package http

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

// jsonResult 统一成功响应：success=true，业务数据放在 result。
func jsonResult(c *gin.Context, code int, data any, other ...gin.H) {
	resp := make(gin.H)
	for _, item := range other {
		for k, v := range item {
			resp[k] = v
		}
	}

	resp["success"] = true
	resp["status"] = "ok"
	if _, ok := resp["result"]; !ok {
		resp["result"] = data
	}
	c.JSON(code, resp)
}

// jsonErr 统一失败响应：success=false，附带 errorCode / errorMessage。
func jsonErr(c *gin.Context, code int, err error, other ...gin.H) {
	if err == nil {
		err = errors.New("unknown error")
	}

	resp := make(gin.H)
	for _, item := range other {
		for k, v := range item {
			resp[k] = v
		}
	}
	resp["success"] = false
	resp["errorCode"] = code
	resp["errorMessage"] = err.Error()
	c.JSON(code, resp)
}

// cors 允许带凭证的跨域，并放行平台鉴权相关请求头（Authorization、X-Uid*、X-Bid 等）。
func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Vary", "Origin")
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, Authorization, X-CSRF-Token, X-Request-ID, X-Bid, X-Mvp, X-Uid-Hash, X-Uid, X-Host")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
