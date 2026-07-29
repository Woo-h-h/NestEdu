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

## 平台智能体（教案 / 周计划生成）

前端直连平台开放 API（需登录态）：

- 非流式：`POST /v1/text/generate`，body `{ "agent_id": <id>, "text": "..." }`
- 教案智能体：[teach/agent/config/14317](https://www.zcat.cn/teach/agent/config/14317)（`VITE_TEACHING_AGENT_ID`，默认 `14317`）
- 周计划智能体：[teach/agent/config/14332](https://www.zcat.cn/teach/agent/config/14332)（`VITE_WEEKLY_PLAN_AGENT_ID`，默认 `14332`）
- 周计划生成会注入：已勾选教案全文 + 知识库 10298 检索摘要
- 本地开发：Vite 代理 `/v1` → `VITE_PLATFORM_API_BASE_URL`

未登录时提示先登录；智能体失败时可降级后端 BFF / DeepSeek / Mock（若已配置）。

## 平台知识库 API（纯前端直连）

前端经 Vite 代理（或生产同域反代）直连平台：

- 列表：`POST /api/knowledge/document/list`（body: `knowledge_id`, `category_id?`, `category_key?`, `current`, `pageSize`）
- 详情：`GET /api/knowledge/document/detail?document_id=`
- 上传：`POST /api/knowledge/document/text`（body: `knowledge_id`, `category_id?`, `title`/`name`, `text`/`content`）

默认知识库：[`teach/knowledge/detail/10298`](https://www.zcat.cn/teach/knowledge/detail/10298?category_id=20806&category_key=custom_1784259353619)（`VITE_DEFAULT_KNOWLEDGE_ID=10298`，分类 `20806`）。鉴权头由 auth-bridge 注入。失败时前端回退本地预设教案。

本地开发代理：`VITE_PLATFORM_API_BASE_URL`（默认 `https://api.zcat.cn`）。

`TeachingPlan` 字段：`id`, `title`, `domain`, `gradeLevel`, `objectives`, `content`, `source`（`platform` | `preset` | `ai`）, `knowledgeId`。

### 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_DEFAULT_KNOWLEDGE_ID` | 默认知识库 ID（默认 `10298`） |
| `VITE_DEFAULT_KNOWLEDGE_CATEGORY_ID` | 默认分类 ID（默认 `20806`） |
| `VITE_DEFAULT_KNOWLEDGE_CATEGORY_KEY` | 默认分类 key |
| `VITE_WEEKLY_PLAN_KNOWLEDGE_CATEGORY_ID` | 周计划分类 ID（默认 `20807`） |
| `VITE_WEEKLY_PLAN_KNOWLEDGE_CATEGORY_KEY` | 周计划分类 key |
| `VITE_ARCHIVE_KNOWLEDGE_CATEGORY_ID` | 教师成果库分类 ID（默认 `20895`） |
| `VITE_ARCHIVE_KNOWLEDGE_CATEGORY_KEY` | 教师成果库分类 key（默认 `custom_1785116184487`） |
| `VITE_TEACHING_AGENT_ID` | 教案生成智能体（默认 `14317`） |
| `VITE_WEEKLY_PLAN_AGENT_ID` | 周计划生成智能体（默认 `14332`） |
| `VITE_PROFILE_AGENT_ID` | 教师画像智能体；调用前由前端按手机号文件夹组装上下文，勿依赖整库检索 |
| `VITE_PLATFORM_API_BASE_URL` | 平台 API，默认 `https://api.zcat.cn` |
| `VITE_PLATFORM_REFERER` | 代理出站 Referer |
| `VITE_USE_BACKEND_API` | 为 `true` 时走 Go BFF（含成果库 CRUD）；为 `false` 时成果库回退 `localStorage`；知识库始终走平台 |

## 成果库 Growth Records API

教师录入类成果（专业研究成果、获奖与荣誉、学习与研修）经 BFF 持久化；前端 `apps/web/src/api/growth.ts` 在 `VITE_USE_BACKEND_API=false` 时使用浏览器 `localStorage`（键 `nestedu_growth_records_v1`）。

### 归属用户

请求须携带以下任一请求头（与现有 BFF 用户解析一致）：

- `X-Uid-Hash`
- `X-Uid`
- `X-User-Id`

### 9) 列表

- `GET /api/v1/growth-records`

Query 筛选（均可选）：

| 参数 | 说明 |
|------|------|
| `year` | 年份，如 `2025` |
| `category` | 类别：`专业研究成果` \| `获奖与荣誉` \| `学习与研修` |
| `level` | 级别 |
| `status` | 状态 |
| `keyword` | 名称/简介/关键词模糊匹配 |

响应 `result`: `GrowthRecord[]`

### 10) 详情

- `GET /api/v1/growth-records/:id`

记录不存在时返回 404。

### 11) 创建 / 更新

- `POST /api/v1/growth-records` — 创建（body 含 `id` 时按 upsert 处理）
- `PUT /api/v1/growth-records/:id` — 按路径 ID 更新

请求体字段（`GrowthRecordPayload`）：

- `id`（必填）
- `name`（必填）
- `year`（必填，整数）
- `category`（必填）
- `subtype`, `date`, `level`, `role`, `org`, `intro`
- `keywords`（字符串数组）
- `status`
- `representative`（布尔，是否代表成果）
- `extra`（对象，类别专属扩展字段）
- `files`（`{ name, type, size }[]` 附件元数据）

响应 `result`: 单条 `GrowthRecord`（含 `createdAt` / `updatedAt`）

### 12) 删除

- `DELETE /api/v1/growth-records/:id`

响应 `result`: `{ "deleted": true }`
