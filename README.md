# mvp-template

可复制的 MVP 项目模板（前后端同仓）：

- 前端：React + TypeScript + Vite
- 后端：Go + Gin（独立服务）
- AI101 iframe 子模块：预装 `@zcat-open/auth-bridge`，向父窗口主框架请求认证上下文

## 目录结构

```text
mvp-template/
├── apps/
│   ├── web/                 # 前端
│   └── api/                 # 后端
├── docs/                    # 架构与接口文档
├── openspec/                # OpenSpec 模板与变更目录
├── scripts/                 # 统一脚本
├── docker/                  # 通用 Dockerfile
└── README.md
```

更多说明：

- MVP 新项目上手开发指南：`docs/mvp-template-usage-guide.md`
- 新手上手：`docs/intern-onboarding.md`
- AI 协作：`docs/AI协作编程技巧和规范.md`
- 架构文档：`docs/architecture.md`
- 接口契约：`docs/api-contract.md`
- AI101 子模块认证（`@zcat-open/auth-bridge`）：`docs/ai101-submodule-auth.md`
- 编码规范：`docs/优雅代码指南.md`
- 旧项目升级：`docs/upgrade-from-legacy.md`
- OpenSpec：`openspec/README.md`

## 新项目本地初始化（推荐）

阿里云 Codeup 当前不支持 fork。正式新项目仓库由技术主管 Wind 协助基于本模板创建。

仓库创建完成并拿到访问权限后，再按以下步骤做本地初始化。完整说明见 `docs/mvp-template-usage-guide.md`。

### 1) 进入本地项目目录

能阅读本 README，说明仓库访问与 clone 已完成。在本地进入项目根目录后继续：

```bash
cd <path-to-your-project>
```

新项目仓库通常已基于本模板初始化，拿到地址后 clone 一次即可。

### 2) 挂载模板仓库

```bash
git remote add template git@codeup.aliyun.com:62a3fefa11fc0f0c9e2a654a/mvp/template_web.git
git fetch template
```

`origin` 是当前业务项目仓库，`template` 是模板仓库。后续吸收模板更新时，不要只看 `git diff` 就合并，建议先拉取模板，再用 AI 编程工具对照 `template/master`，梳理本项目可能漏掉的同步项：

在 Cursor、Codex 等工具中，可基于当前分支与 `template/master` 做对比，重点看 CI/脚本、目录约定、通用配置、文档与 `AGENTS.md` 等工程化改动。示例提示词：

```text
我是编程新手。
我已执行 git fetch template。请对比当前项目与 template/master，
列出模板侧有、本项目尚未同步的改动（按文件或主题分组），
并说明每项是否建议吸收及原因；先给清单，然后指导我如何 merge。
```

可用 `git log` / `git diff --stat` 作快速概览，但以 AI 对照清单为准，确认影响范围后再 `merge` 或 `cherry-pick`，且模板同步单独提交。详细规则见 `docs/upgrade-from-legacy.md`。

### 3) 初始化项目名（按需）

如果项目仓库还保留模板占位名称，再执行：

```bash
./scripts/init-project.sh your-project-name
```

这一步会更新：

- 根目录 `package.json` 名称
- `apps/web/package.json` 名称
- `apps/api/go.mod` 模块路径占位符

### 4) 安装依赖

```bash
pnpm install
```

### 5) 启动前后端

```bash
pnpm dev            # 前端
pnpm dev:backend    # 后端
```

## 常用命令

```bash
pnpm lint
pnpm build
pnpm build:backend
pnpm run ci
./scripts/openspec-new-change.sh <change-id> #非必要，可以让 AI 自行生成 spec
```

## VSCode 任务

模板内置 `.vscode/tasks.json` 和 `.vscode/launch.json`：

- `Web: dev`：启动 Vite 前端
- `API: dev with SQLite`：用 SQLite 启动后端，自动迁移 sample 表
- `Check: CI`：运行 lint、前端 build、后端 test/build
- `Docker: build image`：构建本地镜像
- `Docker: run local`：构建并运行本地 Docker 服务
- `API: debug with SQLite`：VSCode Go 调试配置

## 环境变量

加载顺序（后者覆盖前者，进程环境变量始终最高优先级）：

1. 仓库根目录 `.env`
2. `apps/web/.env` 或 `apps/api/.env`
3. 仓库根目录 `.env.local`
4. `apps/web/.env.local` 或 `apps/api/.env.local`

参考根目录 `.env.example`，应用目录下的 `.env.example` 仅保留可覆盖项。

### 前端

- 核心变量：`VITE_API_BASE_URL`、`VITE_BASE_PATH`
- `VITE_BASE_PATH` 留空时从域名根路径 `/` 访问；配置 `myapp` 或 `/myapp` 时从 `/myapp/` 访问
- `VITE_API_BASE_URL` 默认留空时请求同源 `/api/...`，本地开发由 Vite proxy 转发到后端

### 后端

- 核心变量：`DB_DRIVER`、`DB_DSN`
- 可选变量：`WEB_STATIC_DIR`（让 Go 服务直接托管前端 dist）、`WEB_BASE_PATH`（与 `VITE_BASE_PATH` 保持一致）

## Docker 构建

```bash
docker build -f docker/Dockerfile -t your-project:local .
docker run --rm -p 8088:8088 \
  -e DB_DSN='postgres://user:pass@host:5432/db?sslmode=disable' \
  -e DB_AUTO_MIGRATE=true \
  your-project:local
```

## 默认示例接口

- `GET /healthz`
- `GET /api/v1/sample/items`
- `POST /api/v1/sample/items`

> 默认示例仅用于演示前后端联调与规范。真实业务请走 OpenSpec 后再替换。
