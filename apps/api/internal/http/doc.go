// Package http 是 NestEdu BFF 的 HTTP 路由层。
//
// 职责边界：
//   - 注册路由（/api/v1 自有接口、平台同域反代、前端静态资源）
//   - 中间件（Recovery / Logger / CORS）
//   - 解析 query、body、鉴权相关请求头，调用 service，用统一 JSON 写回
//
// 本层不写业务规则、不做平台字段映射、不直接访问数据库。
package http
