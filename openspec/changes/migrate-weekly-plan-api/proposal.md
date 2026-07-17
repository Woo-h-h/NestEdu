# Proposal: migrate-weekly-plan-api

## Why

Phase A 使用 localStorage 与浏览器直连 DeepSeek，无法满足多设备持久化与安全要求。Phase B 将周计划 CRUD 与 LLM 代理收进 Go 后端。

## What Changes

- `/api/v1/weekly-plans` CRUD
- `/api/v1/ai/weekly-plan/generate` 与 `/modify` LLM 代理
- 前端 `api/weeklyPlan.ts`、`api/llm.ts` 改打自家后端
- 更新 `docs/api-contract.md`

## Impact

- 前端：api 层切换
- 后端：model/store/service/http 新增周计划与 AI 模块
- 接口：新增 7 个端点
- 数据：`weekly_plans` 表
- 风险：需配置 DB 与 DEEPSEEK_API_KEY
