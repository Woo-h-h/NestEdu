# MVP 新项目上手开发指南

本文基于 `mvp-template` 编写，面向新成员、实习生和临时接手项目的同学。目标是在新项目立项后，明确如何开始开发、哪些约定必须保留、遇到问题应该先看哪些文档。

## 1. 模板定位

`mvp-template` 是团队新 MVP 项目的起手模板，不是最终业务项目。

新项目立项时，默认先由技术主管（企业微信搜索 `wind`）基于本模板创建新项目仓库。阿里云 Codeup 当前不支持 fork，因此需要通过模板仓库初始化一个新的正式项目仓库。

仓库创建完成后，项目成员再拉取新项目代码，按本文完成本地初始化、认证验证和最小质量检查。

## 2. 技术栈选型

新项目默认沿用模板技术栈。除非项目负责人和技术主管明确确认，不要自行替换核心框架或包管理器。

| 范围 | 默认选型 | 说明 |
| --- | --- | --- |
| 包管理 | `pnpm` | 统一依赖安装、脚本执行和 workspace filter 用法 |
| 前端框架 | React + TypeScript + Vite | 用于快速构建 iframe MVP 项目和独立 Web 页面 |
| 路由 | React Router | 页面路由集中维护 |
| 样式 | Tailwind CSS v4 | 新页面和组件默认使用 Tailwind |
| UI 组件 | Shadcn UI / Radix UI | 新增通用组件优先复用模板内组件风格 |
| 图标 | `lucide-react` | 按钮和工具类操作优先使用图标 |
| 请求 | Axios 封装 | 业务页面不要直接散写 `fetch` / `axios` |
| 后端 | Go + Gin + GORM | 可独立运行，也可配合 Docker 托管前端静态资源 |
| 规格流程 | Spec，默认推荐 OpenSpec | 中大型需求先让 AI 协助整理 Spec，再实现 |
| AI101 认证 | `@zcat-open/auth-bridge` | MVP 项目通过 iframe 向主框架请求认证上下文 |

如果确实需要替换技术栈，先说明原因、影响范围和迁移成本，再由项目负责人确认。技术栈变化通常会影响主框架接入、部署、质量检查和后续维护。

## 3. 立项与建仓流程

新项目仓库创建由技术主管协助完成。

立项时先确认：

- 项目名称和仓库名称
- 项目负责人和主要参与成员
- 是否作为 AI101 主框架 iframe MVP 项目运行
- 访问路径、部署环境和后端接口域名
- 是否需要额外权限、菜单入口或后端接口配置
- 初始分支策略和代码评审方式

仓库创建后，项目成员再执行本地初始化。

## 4. 本地起手操作

拿到新项目仓库地址后，从 clone 开始。

```bash
git clone <project-repository-url>
cd <project-directory>
```

如果项目名仍保留模板占位名，先初始化项目名：

```bash
./scripts/init-project.sh <your-project-name>
```

安装依赖：

```bash
pnpm install
```

启动前端：

```bash
pnpm dev
```

启动后端：

```bash
pnpm dev:backend
```

常用检查命令：

```bash
pnpm lint
pnpm build
pnpm build:backend
pnpm run ci
```

新项目起步阶段，先确认模板能完整跑通，再开始写业务代码。

## 5. Team Hub 新人必读

本文只说明模板项目本身的使用方式。团队通用规则以 Team Hub 中的新人必读为准。

新成员和实习生进入项目后，先阅读 Team Hub 中的新人必读。建议从这些文章开始：

- [《ONECAT Team Hub 使用说明》](/posts/team-hub-getting-started)
- [《团队技术栈速览》](/posts/team-tech-stack-overview)
- [《新人常见踩坑》](/posts/newbie-common-pitfalls)
- [《Git 分支与自动部署约定》](/posts/git-workflow-and-auto-deploy)
- [《AI 协作指导》](/posts/ai-collaboration-guide)
- [《面向新手的 Docker 部署基础》](/posts/docker-deployment-basics)

如果链接失效，在 Team Hub 中按文章标题搜索。

阅读时重点关注：

- Git 分支和提交规范
- 代码评审流程
- 日报、周报和任务同步要求
- 需求变更确认方式
- 问题沟通和升级路径
- 安全、账号、密钥和数据使用要求

如果 Team Hub 规则与模板文档有冲突，可以先找项目负责人确认。

## 6. AI101 主框架接入

AI101 是内部项目代号，实际就是超喵主平台。

如果新项目作为 AI101 的内置模块运行，默认通过 iframe 嵌入主框架。

必须遵守：

- 你的项目不需要自己实现登录（因为没有必要，已经内置）。
- 你的项目不需要直接向后端换 token（同样没必要，认证桥接包已经内置）。
- 认证上下文由主框架通过 `@zcat-open/auth-bridge` 认证桥接包下发。
- 业务请求统一走 `apps/web/src/api/client.ts` 注入认证请求头。
- 顶层直访登录使用 `VITE_AI101_API_BASE_URL` 作为静态编译配置换取 token，回跳 URL 只读取短期 `ticket`。
- 业务页面不要直接读写 token localStorage（模板默认不持久化 token，避免 token 泄漏）。
- `displayNameHint` 只能用于页面展示或 demo 验证，不能作为身份、角色或权限判断依据。

接入细节见你的项目内的 `docs/ai101-submodule-auth.md`。

## 7. 项目目录说明

```text
mvp-template/
├── apps/
│   ├── web/                 # 前端应用
│   └── api/                 # 后端服务
├── docs/                    # 项目文档
├── openspec/                # OpenSpec 模板与变更目录
├── scripts/                 # 初始化、CI、OpenSpec 脚本
├── docker/                  # Docker 构建入口
└── README.md
```

前端常用目录：

```text
apps/web/src/api/            # API client 和接口封装
apps/web/src/components/     # 可复用组件
apps/web/src/hooks/          # 状态、请求生命周期、复用逻辑
apps/web/src/lib/            # 认证、工具函数、纯逻辑
apps/web/src/pages/          # 页面
apps/web/src/routes/         # 路由
```

后端常用目录：

```text
apps/api/cmd/server/         # 服务入口
apps/api/internal/http/      # 路由、中间件、请求响应
apps/api/internal/service/   # 业务编排
apps/api/internal/store/     # 数据访问
apps/api/internal/model/     # 数据模型
```

## 8. 项目内文档阅读顺序

建议按以下顺序阅读：

1. `AGENTS.md`：了解当前模板仓库的正式协作规范。
2. `README.md`：了解项目结构、启动命令和环境变量。
3. `docs/mvp-template-usage-guide.md`：了解新项目起手流程和注意事项。
4. `docs/intern-onboarding.md`：按实习生视角完成第一天上手。
5. `docs/ai101-submodule-auth.md`：了解 AI101 iframe 认证接入。
6. `docs/architecture.md`：了解前后端分层边界。
7. `docs/api-contract.md`：了解默认接口契约。
8. `docs/优雅代码指南.md`：了解编码质量要求。
9. `docs/AI协作编程技巧和规范.md`：了解如何和 AI 编程工具协作。
10. `docs/commit-convention.md`：了解提交信息格式。
11. `docs/upgrade-from-legacy.md`：旧项目迁移或吸收模板更新时再读。
12. `openspec/README.md`：中大型需求开始前阅读。

## 9. 开发注意事项

不要做：

- 不要绕过 `apps/web/src/api/client.ts` 手写认证 header。
- 不要把 token、账号、密钥、生产配置提交到仓库。
- 不要把 demo 页面当作最终业务页面直接上线。
- 不要在未确认影响范围时修改部署路径、base path 或 iframe 通信逻辑。
- 不要在中大型需求里跳过 Spec。

应该做：

- 先跑通模板，再写业务。
- 业务页面只调用 API 封装，不直接拼请求。
- 接口变化同步更新接口文档。
- 中大型改动先让 AI 协助拆 tasks，按任务推进。
- 提交前至少跑一次与改动范围匹配的检查命令。

## 10. 新项目验收清单

新项目从模板起步后，至少确认：

- [ ] 仓库已基于模板创建，并确认仓库名、负责人和初始分支策略。
- [ ] 项目名、包名、Go module 名称已从模板占位名改成当前项目。
- [ ] 本地 `pnpm install` 成功。
- [ ] 前端 `pnpm dev` 可启动。
- [ ] 后端 `pnpm dev:backend` 可启动。
- [ ] `pnpm lint` 通过，有问题就让 AI 协助定位和修复。
- [ ] `pnpm build` 通过。
- [ ] 如果接入 AI101，iframe 内 demo 页能显示主框架传入的用户名。
- [ ] 如果接入 AI101，`.env` 已配置 `VITE_AI101_LOGIN_ORIGIN` 和 `VITE_AI101_API_BASE_URL`。
- [ ] 如果接入 AI101，业务 API 请求能自动带上认证请求头。
- [ ] README、环境变量示例和项目说明已改成当前项目内容。
- [ ] 模板 demo 文案已按业务需要替换或明确保留为示例。

## 11. 常见问题

### 为什么你当前的项目不需要自己做登录？

AI101 主框架已经负责登录态。`auth-bridge` 会帮你解决登录认证逻辑，你的项目只消费主框架下发的认证上下文，最终权限判断仍以后端为准。
虽然认证桥接包已经帮你解决这个问题，但是你仍要确认登录状态是生效的。

### 为什么本地能打开，嵌入 AI101 后认证失败？

优先检查 `VITE_AI101_PARENT_ORIGINS` 是否包含当前父窗口 origin，并确认没有配置 `*`。再检查主框架是否已传入 token、`bid` 和 `sub`。
如果你在开发模式下访问了主框架的测试地址，可能会遇到登录态不生效的问题。解决方法是：
1. 先在本地启动你的项目，确认访问地址和端口。
2. 在浏览器里访问主框架当前提供的本地测试入口，这个入口会尝试向你的项目 iframe 发送认证上下文。
3. 如果登录态不生效，检查浏览器控制台是否有关于跨域通信的错误，确认你的项目地址和端口是否在 AI101 的父窗口白名单里。

### 为什么 API 返回 401、403 或 431？

优先检查请求是否走了统一 API client，以及 `Authorization` 是否是 `Bearer <token>` 格式。不要在页面里手写请求头。

### 为什么直访登录回跳后换票失败？

先确认回跳 URL 只需要 `ticket`，不要依赖 `ai101_api_base_url`。再检查 `.env` 中的 `VITE_AI101_API_BASE_URL` 是否指向 AI101 API 或实现了 `/api/public/user/account/login_auto` 的自有后端；本地开发还要确认 Vite proxy 是否把该固定路由转发到同一个 API origin。

### 什么时候建议走 Spec？

新功能、接口契约变化、影响线上行为或预计超过半天的开发，都建议先整理 Spec。当前模板默认推荐使用 OpenSpec。
