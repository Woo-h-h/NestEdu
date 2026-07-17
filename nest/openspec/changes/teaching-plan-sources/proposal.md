# Proposal: teaching-plan-sources

## Why

周计划创建原先把「上传日计划直接拼 Prompt」与「选教案」混在一起，缺少「先按主题生成教案再勾选」以及「本地文件入库平台后再选」的主路径。

## What Changes

- 创建页改为三来源 Tab：主题生成 / 平台知识库 / 上传到平台 + 统一教案候选池勾选
- 新增 `POST /api/v1/ai/teaching-plans/generate`（主题 → TeachingPlan[]）
- 新增 `POST /api/v1/knowledge/documents`（BFF 代理平台 `document/text`）
- 周计划生成仅依赖 `selectedPlans`（不再强制本地文件直传 Prompt）

## Impact

- 前端：create 页、`useWeeklyPlan`、`PlanSelector`、`api/llm`、`api/knowledge`、prompts
- 后端：`llm_service` / `ai_handlers`、`knowledge_service` / `knowledge_handlers`、config
- 接口：新增 2 个端点；上传需登录态
- 数据：无新表
- 风险：上游 `document/text` 字段以联调为准；大文件需拆分
