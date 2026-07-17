# 华科附幼智能教案助手

华中科技大学附属幼儿园教学助手：用平台智能体生成教案与周计划，并按分类管理知识库文档。

线上地址：[https://nest.zcat.cn](https://nest.zcat.cn)  
可嵌入 AI101 主框架（iframe + `@zcat-open/auth-bridge`），也可顶层直访登录。

---

## 能做什么

| 模块 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | 入口导航 |
| 课程资源库 | `/resources` | 按主题 + 重点领域生成教案；知识库管理（上传 / 查看 / 删除） |
| 新建周计划 | `/weekly-plan/create` | 勾选教案 → 智能体生成 → 编辑 / AI 改稿 / 导出；**可选**上传到周计划知识库 |
| 周计划管理 | `/weekly-plan/manage` | 与「知识库管理」同能力，专管周计划分类文档 |

**不再提供**本地「历史记录」存档；周计划以知识库为准。

### 知识库与智能体

同一知识库 `10298`，两个分类互不干扰：

| 用途 | 分类 | 页面 |
|------|------|------|
| 教案 / 课程资源 | `category_id=20806` | [知识库 · 教案](https://www.zcat.cn/teach/knowledge/detail/10298?category_id=20806&category_key=custom_1784259353619) |
| 周计划 | `category_id=20807` | [知识库 · 周计划](https://www.zcat.cn/teach/knowledge/detail/10298?category_id=20807&category_key=custom_1784275664825) |

| 能力 | 智能体 | 配置项 |
|------|--------|--------|
| 教案生成 | [14317](https://www.zcat.cn/teach/agent/config/14317) | `VITE_TEACHING_AGENT_ID` |
| 周计划生成 / 修改 | [14332](https://www.zcat.cn/teach/agent/config/14332) | `VITE_WEEKLY_PLAN_AGENT_ID` |

生成走平台 `POST /v1/text/generate`（用户 Token + `agent_id`）。失败会直接报错，**不会静默返回 Mock 数据**。

### 典型流程

```text
登录平台
  → 课程资源库：生成教案 → 确认上传到分类 20806
  → 新建周计划：勾选教案 → 智能体 14332 生成 → 编辑 / 导出
  → （可选）上传到分类 20807，或在「周计划管理」里维护文档
```

---

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **后端**：Go + Gin（BFF、静态托管、平台知识库 / 智能体反代）
- **认证**：`@zcat-open/auth-bridge`（AI101 iframe / 顶层 ticket 换 token）
- **部署**：`docker/Dockerfile` 单镜像（前端 build + Go 服务）

```text
.
├── apps/
│   ├── web/          # 前端
│   └── api/          # Go BFF
├── docs/             # 架构、接口、认证、协作规范
├── docker/           # Dockerfile
├── scripts/          # CI / OpenSpec 等脚本
└── .env.example      # 环境变量模板
```

本地开发优先：**纯前端 + Vite 代理** 调平台知识库与智能体（`VITE_USE_BACKEND_API=false`）。生产由 Go 同域反代 `/api/knowledge`、`/v1`，避免落到 NoRoute。

---

## 本地启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境

复制根目录 `.env.example` 为 `.env`，至少确认：

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

### 3. 启动前端

```bash
pnpm dev          # http://localhost:3005
```

Vite 代理：

- `/api/knowledge` → 平台知识库
- `/v1` → 平台智能体
- `/api/v1` → 本地 Go（可选）

### 4. （可选）启动后端

需数据库时可用 SQLite：

```bash
cd apps/api
# 在 .env 或环境中设置 DB_DRIVER=sqlite、DB_DSN=./data/mvp.db、DB_AUTO_MIGRATE=true
go run ./cmd/server
```

或根目录：`pnpm dev:backend`（默认读根目录 `.env` 中的 Postgres 配置）。

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

## 关键环境变量

加载顺序（后者覆盖前者）：根 `.env` → `apps/*/ .env` → `.env.local` → 进程环境。

| 变量 | 含义 |
|------|------|
| `VITE_USE_BACKEND_API` | `false`：教案/周计划走前端智能体（推荐本地）；`true`：部分能力走 Go BFF |
| `VITE_DEFAULT_KNOWLEDGE_*` | 教案知识库 ID / 分类 |
| `VITE_WEEKLY_PLAN_KNOWLEDGE_CATEGORY_*` | 周计划分类 ID / key |
| `VITE_TEACHING_AGENT_ID` / `VITE_WEEKLY_PLAN_AGENT_ID` | 教案 / 周计划智能体 |
| `VITE_PLATFORM_API_BASE_URL` | 平台 API（本地代理目标） |
| `VITE_AI101_*` | 登录、父窗口白名单、换票 API |
| `PLATFORM_*` / `DEFAULT_KNOWLEDGE_ID` | 后端反代与 BFF 知识库 |

完整列表见 [`.env.example`](.env.example)。

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

生产需在构建阶段注入正确的 `VITE_*`（前端为编译期配置）。部署后若智能体 / 知识库 401，请先在页面登录平台。

---

## 文档

| 文档 | 内容 |
|------|------|
| [docs/architecture.md](docs/architecture.md) | 架构 |
| [docs/api-contract.md](docs/api-contract.md) | 接口与智能体 / 知识库约定 |
| [docs/ai101-submodule-auth.md](docs/ai101-submodule-auth.md) | AI101 认证 |
| [docs/优雅代码指南.md](docs/优雅代码指南.md) | 编码规范 |
| [AGENTS.md](AGENTS.md) | AI / 协作者仓库约定 |
| [openspec/README.md](openspec/README.md) | 变更规格流程 |

本仓库由 MVP 模板演进而来；工程化同步模板的说明仍可参考 `docs/mvp-template-usage-guide.md` 与 `docs/upgrade-from-legacy.md`。
