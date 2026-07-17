# Design: teaching-plan-sources

## Flow

1. 教师填写班级 / 主题 / 周次
2. 选择教案来源：
   - **主题生成**：LLM 产出若干 `TeachingPlan`，并入候选池并默认勾选
   - **平台知识库**：BFF 拉取 `document/list`，展示勾选
   - **上传到平台**：浏览器解析 docx → BFF `document/text` → 刷新列表勾选
3. 勾选后调用既有周计划生成（`selectedPlans` + `themeName`）

## API

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/v1/ai/teaching-plans/generate` | `{ themeName, className?, count? }` → `TeachingPlan[]` |
| POST | `/api/v1/knowledge/documents` | `{ knowledgeId?, title, content, categoryId? }` → `TeachingPlan` |

## Decisions

- 候选池可同时保留 AI 与平台教案；刷新平台时保留 `source=ai` 项
- 上传必须带 `Authorization`；未登录明确报错
- 无 LLM Key 时教案生成返回 Mock
- 默认 UI 移除「上传文件直接生成周计划」；旧 fileContents 字段仍可由 API 兼容

## Config

- `KNOWLEDGE_UPLOAD_PATH` 默认 `/api/knowledge/document/text`
- `DEFAULT_KNOWLEDGE_ID` / `VITE_DEFAULT_KNOWLEDGE_ID`
