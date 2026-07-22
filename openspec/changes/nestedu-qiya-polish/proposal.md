# Proposal: NestEdu 启芽智教 Phase 4 打磨收口

## Why

Phase 0–3 已落地五入口、活动方案/周计划改版、成果库 CRUD 与教师画像。首页仍缺少真实统计闭环，移动端侧栏未对齐原型断点，文档仍描述旧三入口架构。需在不大改业务的前提下统一体验并补齐契约说明。

## What Changes

- 首页仪表盘：并行加载成果库与知识库计数，展示紧凑统计行与个人成长闭环四步入口
- 移动端布局：`max-md` 隐藏桌面侧栏，固定底部五入口导航，主内容区与安全区适配
- 文档：`README.md` 产品描述与路由表、`docs/api-contract.md` 成果库 API、`AGENTS.md` Phase 状态轻量更新

## Impact

- 前端：`dashboard/index.tsx`、`AppLayout.tsx`
- 后端：无改动（复用已有 growth-records 与 knowledge BFF）
- 接口：文档补充 Growth Records API
- 数据：无
- 风险：知识库未登录时计数显示「—」；不虚构观察记录等平台数据
