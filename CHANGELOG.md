# 历史变更（CHANGELOG）

按时间倒序记录 NestEdu / 启芽智教的产品与工程更新摘要。

## 维护约定

- **每次有实质更新**（功能、修复、配置、部署相关改动）都应在本文**顶部**追加一条，不要改写历史条目。
- 条目格式见下方模板；日期用 `YYYY-MM-DD`，必要时注明构建可见版本（侧栏 `vX.Y.Z · buildId`）。
- 用业务语言写清「做了什么 / 为什么」；技术细节点到关键路径或配置即可。
- 纯文档笔误、本地调试草稿可不记；发版或合并前的一批改动可合并为一条。

```text
## YYYY-MM-DD — 一句话标题

- 业务：…
- 技术：…
- 影响 / 验证：…
```

---

## 2026-07-30 — 修复分类字段 `display_name` 未映射导致手机号文件夹找不到

- **业务**：成果库诊断已能拉到平台分类（含 `17362955307`），但仍提示「未找到与手机号对应的文件夹」。
- **技术**：平台 `category/list` 返回 `display_name` / `category_key`（无 `name`）；`NestEduKnowledgeCategoryCodec` 原先只认 `name`，5 条全被丢弃后仅靠文档反推得到 1 个「教师成果库」。现已识别 `display_name`/`displayName`，并以 `category_key` 作名称回退。
- **影响 / 验证**：重新构建部署后，诊断应见 `mappedCount: 5`（或 ≥ 手机号子文件夹数）、`archiveChildNames` 含手机号；侧栏版本号应变化。

## 2026-07-30 — 侧栏版本号 + 生产映射崩溃修复 + 变更文档

- **业务**：侧栏底部增加版本戳（如 `v0.1.0 · 20260730-xxxx` / 本地 `dev`），便于对照是否已部署最新包；成果库手机号文件夹匹配在生产 minify 后失效的问题已修。
- **技术**：
  - `apps/web/src/lib/appVersion.ts` + `AppLayout` 展示；`vite/load-merged-env.ts` / Docker 注入 `VITE_APP_VERSION`、`VITE_APP_BUILD_ID`
  - 分类映射改为 `NestEduKnowledgeCategoryCodec` 对象方法，避免与 React 压缩短名冲突导致 `mappedCount: 0`
  - 新增本文件 `CHANGELOG.md`
- **影响 / 验证**：需重新构建并部署前端后，侧栏版本变化即表示新包生效；成果库应能匹配到手机号同名文件夹。

## 2026-07-30 — 教师画像智能体接入（Agent 14372）

- **业务**：教师画像页增加「智能画像解读」：按当前登录手机号汇总教师成果库文档，注入提示词后调用专属智能体生成个人成长解读（不做教师排名）。
- **技术**：
  - 默认 `VITE_PROFILE_AGENT_ID=14372`（`agent.ts` / `.env.example` / Docker build ARG）
  - `profileAgentPrompt.ts`、`profileAgent.ts`；应用侧做手机号范围 RAG，智能体侧勿挂载整库检索
- **影响 / 验证**：Docker 须在**构建时**注入 `VITE_PROFILE_AGENT_ID`；未配置或旧包仍会提示「未配置教师画像智能体」。

## 2026-07 — 成果库对接「教师成果库」与手机号隔离

- **业务**：
  - 成果库增加「平台 · 教师成果库」与「教师录入」分区；系统统计与教师录入分源可追溯
  - 按登录用户手机号隔离：仅可见/可操作分类下**同名手机号文件夹**及其子内容（例：`17362955307`）
  - 教师画像聚合该文件夹文档 + 本地成果 + 活动/周计划统计
- **技术**：
  - 环境变量 `VITE_ARCHIVE_KNOWLEDGE_CATEGORY_ID` / `VITE_ARCHIVE_KNOWLEDGE_CATEGORY_KEY`（分类约 `20895`）
  - `platformUser` 拉取 `/api/user/self`；知识库请求补齐 `X-Uid-Hash` / `X-Uid`
  - `archiveTeacherScope`、分类扁平化与文档发现回退；成果库页诊断按钮便于排查匹配问题
- **影响 / 验证**：平台需先在「教师成果库」下建**手机号同名**文件夹；本地 `pnpm dev` 与线上均依赖正确 `VITE_*` 与登录态。

## 2026-07 及更早 — Phase 0–4 产品壳与业务主链路（摘要）

- **业务**：五入口信息架构（首页 / 活动方案 / 周计划 / 成果库 / 教师画像）；活动方案与周计划工作台；成果库 CRUD；教师画像与年度报告；Phase 4 打磨（统计对齐、空态/错误态等）。
- **技术**：React + Vite 前端、Go BFF、AI101 智能体与知识库；OpenSpec 分阶段落地。
- **影响 / 验证**：详见 `AGENTS.md`「产品演进规划」与各 OpenSpec change。
