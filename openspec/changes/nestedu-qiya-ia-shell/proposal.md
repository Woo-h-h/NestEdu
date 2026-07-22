# Proposal: NestEdu 启芽智教信息架构壳（Phase 0）

## Why

产品决策采用方案三：按 `preview2.html` 原型扩展为「保教生成 + 成果沉淀 + 教师画像」。当前仅三入口（首页 / 课程资源库 / 周计划），无法承载成果库与画像。需先统一导航壳与路由，再分阶段改业务页。

## What Changes

- 侧栏五入口：首页、活动方案、周计划、成果库、教师画像
- 路由：`/activity`、`/archive`、`/profile`；`/resources` 重定向到 `/activity`
- 活动方案 Phase 0 仍挂载现有教案/知识库页，避免生成链路回归
- 成果库、教师画像先提供占位页（标注后续 Phase）
- 视觉：侧栏/品牌对齐原型松针绿体系

## Impact

- 前端：`AppLayout`、`routes`、dashboard 入口文案、占位页
- 后端：无
- 接口：无
- 数据：无
- 风险：旧书签 `/resources` 依赖重定向；文档中「课程资源库」文案需后续同步 README
