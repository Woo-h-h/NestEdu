# 华科附幼智能教案助手

面向华中科技大学附属幼儿园的教学助手：用平台智能体生成**教案**与**周计划**，并按知识库分类管理、导出文档。

- 线上：[https://nest.zcat.cn](https://nest.zcat.cn)
- 可嵌入 AI101 主框架（iframe + `@zcat-open/auth-bridge`），也可顶层直访登录

---

## 项目概览

教师先在「课程资源库」按主题生成教案并入库，再在「新建周计划」中选择班级、主题、周次并勾选教案，由周计划智能体生成对标「快乐一周」范本的周活动计划；可编辑、AI 改稿、导出 Word/PDF，并可选上传到周计划知识库分类中统一管理。

```text
登录平台
  → 课程资源库：选班级 / 领域 / 主题 → 生成教案 → 确认上传（分类 20806）
  → 新建周计划：选班级 / 主题 / 周次 → 勾选教案 → 智能体生成
  → 编辑 / 导出（如「小班第7周计划.docx」）→ 可选上传（分类 20807）
  → 周计划管理：列表查看、导出、删除、上传 docx
```

---

## 功能模块

| 模块 | 路径 | 能力 |
|------|------|------|
| 首页 | `/` | 入口导航 |
| 课程资源库 | `/resources` | **教案生成**：班级、重点领域、主题 → 智能体生成 → 勾选后确认入库；**知识库管理**：上传 docx、查看、删除 |
| 新建周计划 | `/weekly-plan/create` | 选择大/中/小班、填写主题与周次 → 勾选教案 → 生成 → 编辑 / AI 改稿 / 导出；可选上传知识库 |
| 周计划管理 | `/weekly-plan/manage` | 周计划分类文档的上传、查看、**导出**、删除 |

说明：不提供本地「历史记录」；周计划以知识库为准。旧路径 `/weekly-plan/history` 会跳转到管理页。

### 周计划格式

对标华科附幼「快乐一周」样表：

- 表头：主题名称、班级、周次
- 周工作重点 + 表格四栏：**自主学习 / 自主游戏 / 自主生活 / 自主运动**（周一至周五）
- 实施建议
- 导出文件名：`{班级}第{N}周计划.docx`（例如 `小四班第7周计划.docx`）

### 知识库与智能体

同一知识库 `10298`，两个分类互不干扰：

| 用途 | 分类 | 链接 |
|------|------|------|
| 教案 | `20806` | [知识库 · 教案](https://www.zcat.cn/teach/knowledge/detail/10298?category_id=20806&category_key=custom_1784259353619) |
| 周计划 | `20807` | [知识库 · 周计划](https://www.zcat.cn/teach/knowledge/detail/10298?category_id=20807&category_key=custom_1784275664825) |

| 能力 | 智能体 | 环境变量 |
|------|--------|----------|
| 教案生成 | [14317](https://www.zcat.cn/teach/agent/config/14317) | `VITE_TEACHING_AGENT_ID` |
| 周计划生成 / 修改 | [14332](https://www.zcat.cn/teach/agent/config/14332) | `VITE_WEEKLY_PLAN_AGENT_ID` |

调用方式：`POST /v1/text/generate`（用户 Token + `agent_id`）。失败直接报错，**不静默返回 Mock**。

---

## 技术栈（详细）

### 前端（`apps/web`）

| 技术 | 用途 |
|------|------|
| React 19 + TypeScript | 页面与组件 |
| Vite 8 | 开发服务器、构建；开发期代理平台与本地 Go |
| Tailwind CSS v4 | 样式（`@tailwindcss/vite`） |
| React Router | 路由（`apps/web/src/routes/index.tsx`） |
| axios | HTTP 客户端；请求拦截器注入 AI101 Token（`apps/web/src/api/client.ts`） |
| `@zcat-open/auth-bridge` | iframe 父窗口鉴权 / 顶层 ticket 换 token（`apps/web/src/lib/authBridge.ts`） |
| docx / mammoth | 导出 Word、解析上传的 docx |
| sonner | Toast 提示 |
| Shadcn / Radix | 对话框等基础 UI |

分层约定：`pages/` 装配页面 → `hooks/` 状态与请求 → `api/` 接口封装 → `lib/` 纯函数（提示词、导出、校验）。

### 后端（`apps/api`）

| 技术 | 用途 |
|------|------|
| Go + Gin | HTTP 服务 |
| GORM | 可选持久化（样例表、周计划 CRUD 等） |
| BFF | `/api/v1/knowledge/*`、`/api/v1/ai/*` 等，转发平台并统一响应 |
| 反向代理 | 生产同域转发 `/api/knowledge`、`/v1` 到平台，避免前端跨域与 NoRoute |
| 静态托管 | 可选托管前端 `dist`（`WEB_STATIC_DIR`） |

分层：`internal/http`（协议）→ `internal/service`（业务）→ `internal/store`（持久化）→ `internal/model`。

### 部署与配置

| 项 | 说明 |
|----|------|
| Docker | `docker/Dockerfile`：多阶段构建（pnpm 打前端包 + 编译 Go），单镜像运行 |
| 环境变量 | 根目录 `.env` 为统一配置源；前端 `loadMergedEnv`、后端 `config` 分层加载；**进程环境优先级最高** |
| `VITE_*` | 编译期注入前端包；改完需重启 Vite / 重新 build |

### 仓库结构

```text
.
├── apps/
│   ├── web/                 # React 前端
│   │   ├── src/api/         # agent / knowledge / llm / client
│   │   ├── src/hooks/       # useTeachingResources / useWeeklyPlan / …
│   │   ├── src/pages/       # resources、weekly-plan、dashboard
│   │   └── vite.config.ts   # 开发代理
│   └── api/                 # Go BFF
│       ├── cmd/server/      # 入口
│       └── internal/        # http / service / store / model / config
├── docs/
├── docker/
├── scripts/
└── .env.example
```

---

## 功能如何实现

### 1. 登录与鉴权（AI101）

```text
应用启动 main.tsx
  → startAuthBridge()（authBridge.ts）
  → iframe：向父窗口 requestAuthInfo 拿 Token
  → 顶层直访：跳转 VITE_AI101_LOGIN_ORIGIN/sso-login → 回跳 ticket
       → Vite/平台 /api/public/user/account/login_auto 换 Token
所有业务请求
  → axios 拦截器读取 authBridge → Authorization 等头
```

关键文件：`apps/web/src/lib/authBridge.ts`、`apps/web/src/api/client.ts`、`apps/web/src/components/layout/UserBadge.tsx`。  
未登录时教案/周计划生成与知识库写操作会明确提示登录，而不是降级 Mock。

### 2. 教案生成（智能体 14317）

```text
/resources「教案生成」
  → useTeachingResources.generateTeachingPlansFromTheme
  → api/llm.generateTeachingPlans
  → lib/prompts 拼系统/用户提示词（主题、班级、重点领域）
  → api/agent.generateAgentText({ agentId: 14317 })
  → POST /v1/text/generate
  → 解析 JSON → TeachingPlan[]
  → 用户勾选 → UploadConfirmDialog 确认
  → knowledge.uploadKnowledgeDocument（默认分类 20806）
```

关键文件：`pages/resources/index.tsx`、`hooks/useTeachingResources.ts`、`api/llm.ts`、`api/agent.ts`、`lib/prompts.ts`。

### 3. 教案知识库管理（分类 20806）

列表 / 详情 / 上传文本 / 删除文档，统一走 `apps/web/src/api/knowledge.ts`：

| 环境 | 行为 |
|------|------|
| **本地开发** | 浏览器请求 `/api/knowledge/...`，由 Vite 代理到 `VITE_PLATFORM_API_BASE_URL` |
| **生产构建** | 优先走 Go BFF `/api/v1/knowledge/*`；同域仍可反代原生 `/api/knowledge` |

上传 docx：前端 `mammoth`/`parse-docx` 抽文本 → 确认对话框 → `document/text`（或 BFF documents）。  
列表失败时教案侧可回退本地预设（`data/teachingPlans.ts`）；周计划分类列表不回退预设。

UI：`PlanManageList`、`PlanDetailDialog`、`FileUploadCard`。

### 4. 新建周计划（智能体 14332）

```text
/weekly-plan/create
  ① ClassSelector + 主题 + 周次 → teachingContext（sessionStorage）持久化
  ② fetchKnowledgePlans（教案分类 20806）→ PlanSelector 勾选
  ③ createWeeklyPlan → generateWeeklyPlan
       → prompts + 已选教案全文 + 知识库检索摘要
       → generateAgentText({ agentId: 14332 }) → JSON WeeklyPlan
  ④ PlanEditor 双击单元格编辑；AiChatPanel → modifyWeeklyPlan（仍用 14332）
  ⑤ ExportToolbar → export-doc（docx 库，横版「快乐一周」）/ export-pdf
  ⑥ 可选「上传到知识库」→ weeklyPlanKnowledgeScope（分类 20807）
```

关键文件：`pages/weekly-plan/create/index.tsx`、`hooks/useWeeklyPlan.ts`、`api/weeklyPlan.ts`、`api/llm.ts`、`lib/export-doc.ts`、`lib/weeklyPlanText.ts`、`lib/teachingContext.ts`。

勾选教案按顺序对应周一至周五「自主学习」；导出文件名由 `weeklyPlanFileName` 生成：`{班级}第{N}周计划.docx`。

### 5. 周计划管理（分类 20807）

```text
/weekly-plan/manage → useWeeklyPlanKnowledge
  → 固定 knowledgeId=10298 + category 20807/key
  → 列表 / 上传 docx / 删除（同 knowledge API）
  → 导出：fetchKnowledgePlanById → parseWeeklyPlanFromDocument → exportToDoc
```

关键文件：`pages/weekly-plan/manage/index.tsx`、`hooks/useWeeklyPlanKnowledge.ts`。  
与课程资源库「知识库管理」共用列表/确认上传组件，仅分类不同。

### 6. 请求如何走到平台

**本地（Vite `:3005`）** — `apps/web/vite.config.ts`：

| 前缀 | 目标 |
|------|------|
| `/api/knowledge` | 平台知识库（须写在 `/api/v1` 之前） |
| `/v1` | 平台智能体（如 `/v1/text/generate`） |
| `/api/public/user/account/login_auto` | AI101 换票 |
| `/api/v1` | 本地 Go（默认 `127.0.0.1:8088`，可选） |

**生产（Go）** — `internal/http/router.go` + `platform_proxy.go`：

| 路径 | 行为 |
|------|------|
| `/api/v1/*` | 本服务 BFF（知识库、AI、样例等） |
| `/api/knowledge`、`/v1/*` | 反向代理到 `PLATFORM_API_BASE_URL` |
| 前端静态资源 | `WEB_STATIC_DIR` 托管 SPA |

```text
浏览器
  ├─ 开发：Vite 代理 ──→ api.zcat.cn（知识库 / 智能体）
  └─ 生产：同域 Go ──→ BFF 或反代 ──→ api.zcat.cn
```

---

## 本地启动

```bash
pnpm install
cp .env.example .env   # 按需修改
pnpm dev               # http://localhost:3005
```

推荐本地配置：

```bash
VITE_USE_BACKEND_API=false
VITE_AI101_DIRECT_AUTH=true
VITE_DEFAULT_KNOWLEDGE_ID=10298
VITE_DEFAULT_KNOWLEDGE_CATEGORY_ID=20806
VITE_WEEKLY_PLAN_KNOWLEDGE_CATEGORY_ID=20807
VITE_TEACHING_AGENT_ID=14317
VITE_WEEKLY_PLAN_AGENT_ID=14332
VITE_PLATFORM_API_BASE_URL=https://api.zcat.cn
```

可选启动后端（SQLite）：

```bash
cd apps/api
# DB_DRIVER=sqlite DB_DSN=./data/mvp.db DB_AUTO_MIGRATE=true
go run ./cmd/server
# 或根目录：pnpm dev:backend
```

---

## 常用命令

```bash
pnpm lint
pnpm build
pnpm build:backend
pnpm test:backend
pnpm run ci
```

---

## 环境变量（摘要）

加载顺序：根 `.env` → `apps/*/.env` → `.env.local` → 进程环境。

| 变量 | 含义 |
|------|------|
| `VITE_USE_BACKEND_API` | `false`：教案/周计划走前端智能体（推荐本地） |
| `VITE_DEFAULT_KNOWLEDGE_*` | 教案知识库 ID / 分类 20806 |
| `VITE_WEEKLY_PLAN_KNOWLEDGE_CATEGORY_*` | 周计划分类 20807 |
| `VITE_TEACHING_AGENT_ID` / `VITE_WEEKLY_PLAN_AGENT_ID` | 教案 14317 / 周计划 14332 |
| `VITE_PLATFORM_API_BASE_URL` / `VITE_PLATFORM_REFERER` | 平台 API 与代理 Referer |
| `VITE_AI101_*` | 登录、父窗口白名单、换票 |
| `PLATFORM_*` / `KNOWLEDGE_*_PATH` | Go 反代与 BFF 知识库路径 |
| `DB_DRIVER` / `DB_DSN` | 后端数据库 |

完整列表见 [`.env.example`](.env.example)。本地 `.env` 已 gitignore，勿提交密钥。

---

## Docker

```bash
docker build -f docker/Dockerfile -t nestedu:local .
docker run --rm -p 8088:8088 \
  -e DB_DRIVER=sqlite \
  -e DB_DSN=/app/data/mvp.db \
  -e DB_AUTO_MIGRATE=true \
  nestedu:local
```

`VITE_*` 为编译期注入；生产构建时需带上正确环境变量。知识库 / 智能体 401 时请先登录平台。

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [docs/architecture.md](docs/architecture.md) | 架构 |
| [docs/api-contract.md](docs/api-contract.md) | 接口与智能体 / 知识库约定 |
| [docs/ai101-submodule-auth.md](docs/ai101-submodule-auth.md) | AI101 认证 |
| [docs/优雅代码指南.md](docs/优雅代码指南.md) | 编码规范 |
| [AGENTS.md](AGENTS.md) | 协作者 / AI 约定 |
| [openspec/README.md](openspec/README.md) | 变更规格 |

本仓库由 MVP 模板演进而来；模板同步可参考 `docs/mvp-template-usage-guide.md`、`docs/upgrade-from-legacy.md`。
