# AGENTS.md

这份文件是当前仓库的正式协作规范源。NestEdu 业务演进以本文「产品演进规划」为准；通用工程约定仍适用于前后端实现。先读这里，再读 README 和 docs。

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

NestEdu（华科附幼智能教案助手）在 `mvp-template` 之上演进，当前已具备教案/周计划生成与知识库闭环。下一阶段目标对齐产品原型「启芽智教」：**保教生成 + 成果沉淀 + 教师画像成长**一体化，而不是只做生成工具。

技术底座不变：

- 前端：React + TypeScript + Vite + Tailwind v4 + Shadcn UI
- 后端：Go + Gin + GORM（BFF / 可选持久化 / 同域反代）
- 平台：AI101 智能体 + 知识库（主数据真相源之一）
- 规格：OpenSpec；交付：pnpm monorepo + Docker 多阶段

---

## 产品演进规划（方案三：按原型扩产品）

> 原型参考：`preview2.html`（启芽智教｜幼儿园教师智能工作与成长平台）。  
> 决策：采用**第三方案**——在保留现有教案/周计划能力的前提下，按原型信息架构扩展成果库与教师画像，并统一视觉与导航。  
> 原则：画像用于个人发展，**不做教师排名或绩效评分**；系统生成成果与教师录入成果分源可追溯；中大型改动必须先开 OpenSpec change。

### 目标产品形态

侧栏五入口（对齐原型，命名可微调）：

| 导航 | 路由建议 | 能力摘要 | 与现状关系 |
|------|----------|----------|------------|
| 首页 | `/` | 欢迎、快捷入口、统计、成长闭环、最近动态、趋势 | 重做仪表盘 |
| 活动方案 | `/activity` | 左表单右预览；生成单次活动方案；可从周计划带入 | 由现「课程资源库/教案」升级改版 |
| 周计划 | `/weekly-plan` | 周看板统筹；点击活动可跳转活动方案 | 改版现有周计划页 |
| 成果库 | `/archive` | 系统统计 + 教师录入；筛选；卡片/时间轴；详情抽屉 | **新建** |
| 教师画像 | `/profile` | 成长结构、趋势、代表成果、优劣势、行动建议、年度报告 | **新建** |

兼容：旧路径 `/resources` 可重定向到 `/activity`（或保留「知识库管理」为活动方案页内 Tab，避免丢现有入库能力）。

### 数据与真相源

```text
系统生成类（自动统计，不要求教师重复录入）
  ├─ 活动方案 / 教案 → AI101 知识库教案分类 + 本地计数/元数据
  ├─ 周计划 → AI101 知识库周计划分类 + 本地计数/元数据
  └─ （后续可扩展）观察记录、园本资源等 → 有数据源再接入，无源则先占位或隐藏

教师录入类（成果库手动新增）
  ├─ 专业研究成果（论文/课题/案例…）
  ├─ 获奖与荣誉
  └─ 学习与研修

教师画像
  └─ 由「系统生成计数 + 教师录入成果」聚合计算；可缓存快照，但须可重算
```

硬约束：

1. **正式教案/周计划文档**仍以 AI101 知识库为准；本地库存成果录入、行动计划、画像快照等。
2. 系统统计与教师录入在 UI 上必须标明来源（原型中的「系统自动统计 / 教师录入」）。
3. 画像文案禁止「排名」「绩效分」表述；结构值仅作个人成长观察。
4. 任何 Agent/OCR/报告生成须有终止条件（超时、明确失败、人工确认）。

### 分阶段落地（必须按阶段推进）

#### Phase 0 — 壳与信息架构（约 3–5 天）

- 侧栏/顶栏对齐原型松针绿体系；品牌文案可暂用「NestEdu / 启芽智教」产品决策后统一。
- 路由挂上五入口；成果库/画像可先占位页。
- `/resources` → `/activity` 兼容重定向；周计划旧子路径保持重定向。
- OpenSpec：`nestedu-qiya-ia-shell`（或同等 change-id）。

验收：五入口可切换；现有登录与生成主链路不回归。

#### Phase 1 — 活动方案 + 周计划工作台改版（约 1–2 周）

- **活动方案**：左右工作台（条件表单 / 方案预览）；领域 chip、时长、重点关注；生成后可保存入库（接现有 Agent + 知识库）。
- **周计划**：周看板（五列）；「生成详细方案」带入主题并跳转活动方案；保存计入成果库统计。
- 保留现有知识库管理能力（建议作为活动方案或周计划页内「知识库」分区，避免能力回退）。
- 导出 Word/PDF 保留。

验收：原型核心交互可用；生成/入库/导出与 AI101 联调通过；`pnpm --filter ./apps/web build` 通过。

#### Phase 2 — 成果库（约 1.5–2 周）

- 列表：汇总条（系统统计 + 三类录入计数）、筛选、卡片/时间轴、详情抽屉、编辑/删除、代表成果标记。
- 录入：三步（选类别 → 填表 → 上传确认）；三类专属字段对齐原型 `categoryConfig`。
- 存储：Go `http/service/store/model` 新增成果域（建议表 `growth_records`）；附件先本地/对象存储策略在 OpenSpec 里定一种，MVP 可先元数据 + 可选文本抽取。
- OCR/智能识别：可先做「可选增强」；无可靠平台能力时用明确「人工核对」流程，禁止假成功。

验收：CRUD 完整；与首页统计打通；后端 `go test ./...` 覆盖 store/service 主路径。

#### Phase 3 — 教师画像与年度报告（约 1.5–2 周）

- 数字名片、成长维度卡、雷达/趋势/分布（图表库选型在实现前定一种，优先轻量）。
- 优势/待发展：规则引擎优先（可解释、可测）；后续再考虑 Agent 润色文案。
- 行动建议：可勾选、计划日期、进度；本地或后端持久化。
- 年度报告：预览 Modal + 打印/PDF；数据全部来自成果库聚合，注明数据说明。

验收：无录入时有空态；有数据时画像与报告一致；文案合规（不排名）。

#### Phase 4 — 打磨与收口（进行中 · OpenSpec `nestedu-qiya-polish`）

> **Phase 0–3 已落地**（信息架构壳、活动方案/周计划改版、成果库、教师画像）。

- 首页闭环与真实统计对齐；空态/错误态/未登录拦截统一。
- 移动端侧栏行为对齐原型断点；无障碍与加载态补齐。
- 更新 README、`docs/api-contract.md`、必要时补架构说明。
- 全量 `pnpm run ci`。

### 前端目录建议（实现时按此拆，避免页内巨型组件）

```text
apps/web/src/
  pages/
    home/
    activity/          # 原 resources 升级
    weekly-plan/       # 改版
    archive/           # 新建：列表 + upload 子流程
    profile/           # 新建：画像 + report
  components/
    layout/            # 侧栏/顶栏对齐原型
    archive/
    profile/
  hooks/
    useGrowthRecords.ts
    useProfileMetrics.ts
  api/
    growth.ts          # 成果 CRUD
    profile.ts         # 画像聚合（若走 BFF）
  lib/
    profile-metrics.ts # 纯函数聚合，便于单测
```

### 后端域建议

```text
apps/api/internal/
  model/growth_record.go
  store/growth_store.go
  service/growth_service.go
  service/profile_service.go   # 聚合统计，可先同步计算
  http/growth_handlers.go
  http/profile_handlers.go
```

接口前缀继续 `/api/v1`。知识库/智能体仍经现有反代或封装，不把平台协议泄漏进页面。

### 明确不做（本规划周期内）

- 教师之间对比、排行榜、绩效打分
- 虚构的「观察记录/园本资源」平台数据（无真实数据源前不假装已接通）
- 把 preview HTML 整页复制进仓库当正式前端（只作视觉与交互参考，实现必须 React + Tailwind + Shadcn）
- 无终止条件的 Agent 自动改画像/自动归档

### 协作与变更纪律

1. 每一 Phase 开始前创建 OpenSpec change，在 `tasks.md` 勾选推进。  
2. UI 以原型为准，但交互文案、路由名以本文件与产品确认为准。  
3. 先契约（类型 + API）再铺大页面；统计与画像逻辑优先纯函数 + 单测。  
4. 每阶段合并前：前端 `pnpm --filter ./apps/web build`；若有后端域改动：`cd apps/api && go test ./...`。

### 原型对照检查清单（实现自测）

- [ ] 五入口导航与顶栏标题切换
- [ ] 活动方案：生成预览、保存、从周计划带入
- [ ] 周计划：五列看板、换一套、保存
- [ ] 成果库：筛选、双视图、抽屉详情、代表成果
- [ ] 录入三步与三类专属字段
- [ ] 画像：维度/趋势/优劣势/行动/报告
- [ ] 来源标注与「不排名」声明可见
- [ ] 未登录拦截与失败显式提示（不 Mock 成功）

---

## 工程底座（模板约定）

以下约定继承自 mvp-template，实现 NestEdu 演进时仍须遵守。

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
