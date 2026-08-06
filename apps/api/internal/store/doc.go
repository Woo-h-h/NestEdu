// Package store 是 NestEdu BFF 的数据访问层。
//
// 使用 GORM 访问本服务 MySQL，提供按 owner / 手机号等条件的增删改查。
// 正式教案与周计划正文以 AI101 知识库为准，不经本包落库；
// 可迁移实体清单见 DomainModels。
//
// 本层不做业务校验与平台 HTTP 调用。
package store
