# Proposal: migrate-weekly-plan-fe

## Why

将 YRY_Agent（KinderPulse）周计划核心能力迁入 nest mvp-template，在保持模板框架不变的前提下实现前端功能对等。

## What Changes

- Dashboard + 周计划路由与 Layout
- 周计划领域模型、预设教案、localStorage 持久化（Phase A）
- 创建/编辑/AI改稿/历史/导出主流程
- DeepSeek 与 Team Hub 前端 API 封装（Phase A 临时直连）

## Impact

- 前端：`apps/web/src/pages/weekly-plan/*`、`api/*`、`lib/*`、`hooks/*`
- 后端：无（Phase A）
- 接口：无新增后端接口
- 数据：浏览器 localStorage `weekly_plans`
- 风险：DeepSeek Key 暴露于浏览器，Phase B 将收进后端
