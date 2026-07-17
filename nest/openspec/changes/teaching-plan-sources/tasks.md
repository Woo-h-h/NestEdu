# Tasks: teaching-plan-sources

## P0 UI

- [x] 创建页三 Tab + 统一候选池
- [x] `generatePlan` 仅依赖 `selectedPlans`
- [x] `PlanSelector` 改为受控候选池

## P1 AI 教案

- [x] 前端 `generateTeachingPlans` + Prompt/校验/Mock
- [x] 后端 `POST /api/v1/ai/teaching-plans/generate`

## P2 上传平台

- [x] BFF `POST /api/v1/knowledge/documents` → `document/text`
- [x] 前端 docx 解析上传并刷新列表
- [x] 未登录提示

## P3 文档

- [x] `docs/api-contract.md`
- [x] `.env.example` 增加 `KNOWLEDGE_UPLOAD_PATH`
- [x] OpenSpec `teaching-plan-sources`
