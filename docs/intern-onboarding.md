# MVP Template 新手说明（实习生版）

目标：让你在 1 天内完成一个小需求并提 PR。

## 1. 先记住三件事

1. 这是“项目模板”，不是最终业务代码。
2. 阿里云 Codeup 当前不支持 fork，新项目仓库由技术主管 Wind 基于模板创建。
3. 中大型改动先整理 Spec，再写代码。

## 2. 新项目本地初始化流程

1. 拉取项目仓库

正式项目仓库由 Wind 协助创建。拿到仓库地址后再 clone：

```bash
git clone <project-repository-url>
cd <project-directory>
```

2. 初始化项目名（推荐）

如果项目名仍保留模板占位名，再执行：

```bash
./scripts/init-project.sh your-project-name
```

3. 安装与启动

```bash
pnpm install
pnpm dev
pnpm dev:backend
```

## 3. 目录与职责

```text
apps/web/                  # React 前端
apps/api/                  # Go 后端
docs/                      # 文档
openspec/                  # 变更规格化管理
scripts/                   # 脚本
```

## 4. 编码规范（强制）

- 页面层禁止直接写 `axios/fetch`，统一走 `apps/web/src/api/*`
- 后端统一使用 `internal/http` 中的响应 helpers，并保持 `success/result/errorMessage` 响应包络
- 错误必须显式处理，不允许吞错
- 函数小而清晰，避免深层嵌套
- 规范文档优先读：`docs/优雅代码指南.md`
- AI 协作先读：`docs/AI协作编程技巧和规范.md`

## 5. Spec 与 AI 协作（重点）

### 5.1 先理解 Spec

Spec 是需求实现前的规格说明，用来先讲清目标、边界、方案、任务和验收标准，再进入编码。

Spec 可以用 OpenSpec，也可以用项目负责人指定的其他 Spec 工具。`mvp-template` 当前推荐 OpenSpec，并默认带有 `openspec/` 目录和相关脚本。

如果正式项目被裁剪过，先让 AI 检查当前项目实际接入了哪种 Spec 工具，再按项目现状推进。

### 5.2 什么时候使用 Spec 流程

满足任一条就要用：

- 新功能
- 接口契约变化
- 影响线上行为
- 开发预计超过半天

### 5.3 不建议手动维护

Spec 不要求新人手动一点点维护。现在优先让 AI 编程工具协助完成：

- 确认当前项目使用哪种 Spec 工具
- 判断当前需求是否要使用 Spec 流程
- 创建或更新 `proposal.md`、`design.md`、`tasks.md`
- 开发过程中同步勾选 tasks
- 接口变化时同步 `docs/api-contract.md`
- 完成后检查 Spec 文档和代码实现是否一致

你需要做的是把目标、范围和验收标准说清楚，然后 review AI 生成的文档和改动。

可以直接复制这个提示词：

```text
我是新成员，请按 mvp-template 的规范协助我完成这个需求。

目标：<要解决什么问题>
范围：只改 <目录/模块>，其他范围请先问我
验收：<页面表现 / 接口行为 / 需要跑的命令>

请先确认当前项目使用哪种 Spec 工具。
如果还没有接入 Spec 工具，请说明需要补哪些初始化步骤。
如果已经可用，请判断这个需求是否要使用 Spec 流程。
需要使用时，请你创建或更新 Spec，并在实现过程中维护 tasks。
完成后请帮我检查 Spec、接口文档和代码实现是否一致。
```

## 6. 提交前自检

提交前自检也可以交给 AI 工具协助执行和整理结果。不要只让 AI 改代码，提交前要明确要求它检查工作区、跑必要命令并输出结论。

可以直接复制这个提示词：

```text
请帮我做提交前自检。

要求：
1. 检查 git diff，说明本次改动范围。
2. 判断是否需要同步 Spec、接口文档或 README。
3. 按改动范围运行必要命令，例如 pnpm lint、pnpm build、pnpm build:backend 或 pnpm run ci。
4. 如果有命令不能运行，请说明原因和风险。
5. 最后整理 PR 描述需要包含的目标、改动点、验证结果和风险点。
```

你需要确认：

1. AI 确实检查了当前 diff。
2. AI 已说明跑过哪些命令，结果是什么。
3. 失败项、跳过项和风险点已经写清楚。
4. PR 描述包含 change-id、验证结果和需要 reviewer 关注的点。

更多 MVP 新项目上手说明见 `docs/mvp-template-usage-guide.md`。
