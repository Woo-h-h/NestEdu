// Package service 是 NestEdu BFF 的业务编排层。
//
// 两类编排：
//   - 本地域：校验规则后委托 store 读写 MySQL（成果、周计划、画像快照、入库计数等）
//   - 平台域：经 PlatformClient 对接 AI101 知识库与智能体（分类纠正、上传/列表、生成与解析）
//
// 本层不处理 Gin Context / HTTP 编码，也不直接拼 SQL。
package service
