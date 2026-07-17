# AGENTS.md

这份文件是当前模板仓库的正式协作规范源。复制本模板创建新 MVP 项目后，先读这里，再读 README 和 docs。

详细展开看：

- [README.md](README.md)
- [docs/mvp-template-usage-guide.md](docs/mvp-template-usage-guide.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/api-contract.md](docs/api-contract.md)
- [docs/ai101-submodule-auth.md](docs/ai101-submodule-auth.md)
- [docs/commit-convention.md](docs/commit-convention.md)
- [docs/upgrade-from-legacy.md](docs/upgrade-from-legacy.md)
- [openspec/README.md](openspec/README.md)

## 系统定位

`mvp-template` 是所有 MVP 项目的起手模板，不是业务成品。它提供：

- 前端：React + TypeScript + Vite
- 后端：Go + Gin + GORM
- 规格流程：OpenSpec
- 最小验证：前端 build/lint、后端 test/build
- 部署起点：通用 Dockerfile

## 当前结构

```text
apps/
  web/                 # React + Vite + TypeScript
  api/                 # Go + Gin + GORM
docs/                  # 架构、接口、上手说明
openspec/              # 规格和变更目录
scripts/               # 统一脚本
docker/                # 通用镜像构建入口
```

## 后端约定

- `internal/http`
  - 只处理 HTTP 协议、请求解析、响应编码、路由注册
- `internal/service`
  - 只处理业务编排、规则校验、跨 store 组合
- `internal/store`
  - 只处理持久化、查询、模型集合
- `internal/model`
  - 只放数据模型定义

不要把业务逻辑重新堆回：

- `cmd/server/main.go`
- router 初始化函数
- handler 匿名函数
- 临时 `gin.H`

## 前端约定

- `pages/`
  - 页面装配层
- `components/`
  - 可复用 UI 和局部交互
- `hooks/`
  - 状态、请求生命周期、持久化
- `lib/`
  - 规则、格式化、错误解析、纯函数
- `api/`
  - API client、接口封装和接口类型

- 组件与样式规范（AI 协作优先）：
  - 样式开发一律使用 Tailwind CSS（当前为 Tailwind v4）。
  - UI 组件库优先使用 **Shadcn UI**，新增组件优先选用官方组件并通过 `npx shadcn@latest add` 方式引入。
  - *注：Shadcn UI 采用源码注入模式且与 Tailwind 深度结合，无专有私有属性，极其适合 AI 进行低幻觉的样式生成与重构。*

如果一个页面开始同时做请求、映射、localStorage、复杂错误解析和大段交互规则，就该拆。

## 旧项目升级约定

已有旧代码的项目，先把旧代码整体归档到 `archive/v1/`，再以新版模板作为根目录基线迁移业务。

新项目不是模板仓库的正式 fork，但 `master` 分支和模板仓库有共同历史。本地 clone 后建议添加 `template` remote 指向模板仓库，用于拉取、对比和吸收模板更新。同步模板更新前先 `fetch`，再用 AI 编程工具对照 `template/master` 梳理可能漏掉的同步项（`git diff --stat` 仅作概览），确认影响范围后再 merge 或 cherry-pick，且模板同步应单独提交。

旧代码只作为参考，不直接复制回新结构。迁移细则见 [docs/upgrade-from-legacy.md](docs/upgrade-from-legacy.md)。

## OpenSpec 约定

中大型改动先创建变更：

```bash
./scripts/openspec-new-change.sh <change-id>
```

实现时按 `openspec/changes/<change-id>/tasks.md` 勾选推进。完成后同步接口文档和规格文档。

## Git 提交约定

提交信息使用轻量 Conventional Commits：

```text
<type>(<scope>): <summary>
```

详细规则见 [docs/commit-convention.md](docs/commit-convention.md)。

## 自动化边界

任何模型调用、Agent 调用、外部 API 调用或自动化重试，都必须有终止条件。

必须明确至少一种：

- 最大重试次数
- 最大步骤数
- 超时时间
- 明确成功条件
- 明确失败返回
- 人工确认后继续

如果不能定义终止条件，就不要自动化。

## 最小验证

前端改动后至少跑：

```bash
pnpm --filter ./apps/web build
```

后端改动后至少跑：

```bash
cd apps/api && go test ./...
```

全量检查：

```bash
pnpm run ci
```
