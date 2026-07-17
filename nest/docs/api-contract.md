# API 契约（MVP Template + 周计划）

## 通用响应格式

### 成功

```json
{
  "success": true,
  "status": "ok",
  "result": {}
}
```

### 失败

```json
{
  "success": false,
  "errorCode": 400,
  "errorMessage": "xxx"
}
```

## 示例接口

### 1) 健康检查

- `GET /healthz`

### 2) Sample 列表

- `GET /api/v1/sample/items?page=1&limit=20`

## 周计划 API

### 3) 获取周计划列表

- `GET /api/v1/weekly-plans`

响应 `result`: `WeeklyPlan[]`

### 4) 获取周计划详情

- `GET /api/v1/weekly-plans/:id`

记录不存在时返回 404。

### 5) 保存周计划

- `POST /api/v1/weekly-plans`
- `PUT /api/v1/weekly-plans/:id`

请求体字段：

- `id`（必填）
- `themeName`（必填）
- `className`
- `weekNumber`
- `weeklyFocus`
- `dailyPlans`（5 条，周一~周五）
- `suggestions`
- `status`（`draft` | `saved`）

### 6) 删除周计划

- `DELETE /api/v1/weekly-plans/:id`

## AI 周计划 API

### 7) 生成周计划

- `POST /api/v1/ai/weekly-plan/generate`

请求体：

```json
{
  "themeName": "亲亲自然",
  "className": "小班",
  "weekNumber": 3,
  "notes": "",
  "fileContents": [{ "name": "周一.docx", "content": "..." }],
  "selectedPlans": []
}
```

响应 `result`: `WeeklyPlan`

### 8) AI 修改周计划

- `POST /api/v1/ai/weekly-plan/modify`

请求体：

```json
{
  "currentPlan": {},
  "instruction": "加强安全教育",
  "chatHistory": []
}
```

响应 `result`:

```json
{
  "message": "已更新...",
  "updatedPlan": {}
}
```

未配置 `DEEPSEEK_API_KEY` 时，生成/修改接口返回 Mock 数据。

### 8b) 按主题生成教案

- `POST /api/v1/ai/teaching-plans/generate`

请求体：

```json
{
  "themeName": "亲亲自然",
  "className": "小班",
  "count": 5
}
```

响应 `result`: `TeachingPlan[]`（`source` 为 `ai`，id 形如 `ai_{timestamp}_{i}`）

未配置 LLM Key 时返回 3～5 条 Mock 教案。

## 平台智能体（教案生成）

前端直连平台开放 API（需登录态）：

- 非流式：`POST /v1/text/generate`，body `{ "agent_id": 14317, "text": "..." }`
- 默认智能体：[teach/agent/config/14317](https://www.zcat.cn/teach/agent/config/14317)
- 配置：`VITE_TEACHING_AGENT_ID`（默认 `14317`）
- 本地开发：Vite 代理 `/v1` → `VITE_PLATFORM_API_BASE_URL`

未登录时提示先登录；智能体失败时可降级本地 Mock / DeepSeek（若已配置）。

## 平台知识库 API（纯前端直连）

前端经 Vite 代理（或生产同域反代）直连平台：

- 列表：`POST /api/knowledge/document/list`（body: `knowledge_id`, `current`, `pageSize`）
- 详情：`GET /api/knowledge/document/detail?document_id=`
- 上传：`POST /api/knowledge/document/text`（body: `knowledge_id`, `title`/`name`, `text`/`content`）

默认知识库 ID：`VITE_DEFAULT_KNOWLEDGE_ID`（如 `10298`）。鉴权头由 auth-bridge 注入。失败时前端回退本地预设教案。

本地开发代理：`VITE_PLATFORM_API_BASE_URL`（默认 `https://api.zcat.cn`）。

`TeachingPlan` 字段：`id`, `title`, `domain`, `gradeLevel`, `objectives`, `content`, `source`（`platform` | `preset` | `ai`）, `knowledgeId`。

### 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_DEFAULT_KNOWLEDGE_ID` | 默认知识库 ID |
| `VITE_PLATFORM_API_BASE_URL` | 平台 API，默认 `https://api.zcat.cn` |
| `VITE_PLATFORM_REFERER` | 代理出站 Referer |
| `VITE_USE_BACKEND_API` | 仅影响周计划 CRUD / LLM；知识库始终走平台直连 |
