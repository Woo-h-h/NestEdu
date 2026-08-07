package http

import (
	"errors"

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
