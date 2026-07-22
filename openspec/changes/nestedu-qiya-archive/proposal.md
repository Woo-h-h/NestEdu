# Proposal: NestEdu 成果库（Phase 2）

## Why

Phase 0 已挂成果库占位页；教师画像（Phase 3）依赖「系统生成计数 + 教师录入成果」聚合。需实现成果库 CRUD、筛选、双视图与录入三步流，并打通可选 Go BFF 持久化。

## What Changes

- 后端：`growth_records` 域（model / store / service / HTTP `/api/v1/growth-records`）
- 前端：成果库列表、录入 `/archive/upload`、详情抽屉、localStorage 降级
- 首页成果库卡片展示教师录入计数（轻量）
- 系统统计（活动方案/周计划）标注「系统自动统计 · 待接入」，不虚构平台数据

## Impact

- 前端：`pages/archive`、`hooks/useGrowthRecords`、`api/growth.ts`
- 后端：`apps/api/internal/{model,store,service,http}` 新增 growth 域
- 接口：`/api/v1/growth-records` CRUD
- 数据：SQLite `growth_records` 表（AutoMigrate）
- 风险：附件 MVP 仅元数据；OCR 不做假成功
