# Design: migrate-weekly-plan-api

## 周计划模型

- 主键：字符串 `id`（与前端 `plan_${timestamp}` 对齐）
- `owner_id`：从请求头 `X-Uid-Hash` 提取，无则 `anonymous`
- `daily_plans`：JSON 文本列

## API

| 方法 | 路径 |
|------|------|
| GET | `/api/v1/weekly-plans` |
| GET | `/api/v1/weekly-plans/:id` |
| POST | `/api/v1/weekly-plans` |
| PUT | `/api/v1/weekly-plans/:id` |
| DELETE | `/api/v1/weekly-plans/:id` |
| POST | `/api/v1/ai/weekly-plan/generate` |
| POST | `/api/v1/ai/weekly-plan/modify` |

## LLM

Key 仅存 `apps/api` 环境变量；无 Key 时后端返回 Mock 数据。

## 前端切换

`VITE_USE_BACKEND_API=true`（默认）时走后端；`false` 时回退 Phase A localStorage + 浏览器 LLM（仅本地开发）。
