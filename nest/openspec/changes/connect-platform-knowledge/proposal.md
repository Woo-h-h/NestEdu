# Proposal: connect-platform-knowledge

## Why

周计划创建页需要从平台知识库（如 `teach/knowledge/detail/10298`）选择教案，并复用 auth-bridge 鉴权。

## What Changes

- Go BFF：`GET /api/v1/knowledge/plans`、`GET /api/v1/knowledge/plans/:id`
- 代理 `api.zcat.cn` 知识库接口，转发 `Authorization` / `X-Bid` 等头
- 前端 `api/knowledge.ts`，`PlanSelector` 改走 BFF；失败时回退本地预设
- `docs/api-contract.md`、`.env.example` 补充配置

## Impact

- 前端：`api/knowledge.ts`、`PlanSelector`、`api/llm.ts`
- 后端：`knowledge_service`、`platform_client`、`knowledge_handlers`
- 接口：新增 2 个端点
- 数据：无新表
- 风险：平台知识库真实路径/字段需 ZCAT 侧确认，当前通过 env 可配置
