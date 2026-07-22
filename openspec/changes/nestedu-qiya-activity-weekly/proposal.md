# Proposal: NestEdu 活动方案 + 周计划工作台改版（Phase 1）

## Why

Phase 0 已挂五入口壳；活动方案仍沿用「单列表单 + 卡片列表」旧布局，周计划缺少原型中的周看板与「生成详细方案」跳转闭环。Phase 1 需对齐 `preview2.html` 工作台交互，同时保留现有 Agent 生成、知识库入库与登录链路。

## What Changes

- **活动方案**：左右工作台（条件表单 / 文档预览）；领域 chip、时长、重点关注；URL 参数 `topic`/`domain` 从周计划带入
- **周计划**：Mon–Fri 看板组件；集体教学单元格「生成详细方案」跳转活动方案；保留 PlanEditor、导出、AI 修改与知识库 Tab
- 文案统一为「活动方案 / 单次活动」「周计划」
- 后端无变更；生成仍走教案智能体 14317、周计划智能体 14332

## Impact

- 前端：`pages/resources/index.tsx`、新建 `ActivityPlanPreview.tsx`、`WeekBoard.tsx`、`lib/inferFocusDomain.ts`
- 前端 API/Hook：`generateTeachingPlans` 与 `useTeachingResources` 传递补充说明（含时长）
- 后端：无
- 风险：预览区与列表勾选状态需同步；URL 参数仅首次 mount 读取
