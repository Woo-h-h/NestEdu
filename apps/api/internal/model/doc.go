// Package model 定义 NestEdu BFF 的数据形状。
//
// 两类定义：
//   - MySQL 表实体：带 gorm 标签与 TableName，由 store.DomainModels 参与 AutoMigrate
//     （如 GrowthRecord、WeeklyPlan、ProfileSnapshot、TeacherGeneratedDoc）
//   - 接口 / 领域 DTO：无 gorm 标签，不建表（如 TeachingPlan，由知识库平台响应映射而来）
//
// 平台知识库的物理表不在本仓库；平台原始响应结构在 service/platform_knowledge.go
// （PlatformAPIEnvelope / PlatformDocument），再映射为本包 TeachingPlan。
package model
