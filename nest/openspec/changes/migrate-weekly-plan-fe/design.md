# Design: migrate-weekly-plan-fe

## 鉴权

使用 nest 现有 `@zcat-open/auth-bridge`，不迁入 YRY `AuthBootstrap` / `login_auto`。

## 前端分层

- `pages/`：页面装配
- `components/`：Layout、周计划子组件
- `hooks/useWeeklyPlan.ts`：状态与副作用（替代 YRY Zustand）
- `lib/`：prompts、docx 解析、导出、校验
- `api/`：weeklyPlan、llm、teamHub 封装

## 路由

| 路径 | 页面 |
|------|------|
| `/` | Dashboard |
| `/weekly-plan/create` | 新建周计划 |
| `/weekly-plan/history` | 历史记录 |

## Phase A 存储

localStorage 键 `weekly_plans`，结构与 YRY 一致。

## Phase A LLM

`api/llm.ts` 封装 DeepSeek；无 Key 走 `mock/weeklyPlan.ts`。
