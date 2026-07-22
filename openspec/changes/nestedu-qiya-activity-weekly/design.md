# Design: nestedu-qiya-activity-weekly

## Context

- Phase 0：`/activity` 挂载 `ResourcesPage`，五入口与松针绿壳就绪
- 现有能力：`useTeachingResources`、`useWeeklyPlan`、`PlanEditor`、`PlanManageList`、知识库 upload/generate
- 原型参考：`preview2.html`（左表单右预览；周五列看板）

## Goals / Non-Goals

### Goals

- 活动方案 generate 区改为 `lg:grid-cols-2` 工作台
- 周计划生成后展示 `WeekBoard`，集体教学可跳转 `/activity?topic=…&domain=…`
- 保留双 Tab（生成 | 知识库管理）与 upload/confirm 流程
- 补充说明（含活动时长）传入教案 Agent prompt

### Non-Goals

- 成果库、教师画像（Phase 2/3）
- 后端新域或 API 变更
- 整页复制 preview HTML
- 周计划看板替代 PlanEditor 表格编辑（看板为概览，PlanEditor 保留）

## Decisions

### Decision 1: 预览与勾选分离

- **选择**：右侧 `ActivityPlanPreview` 只读展示当前选中方案；下方 `PlanManageList` 负责勾选上传
- **备选**：左侧紧凑勾选 — 预览区空间不足，与原型右栏文档预览不一致

### Decision 2: 领域跳转推断

- **选择**：`lib/inferFocusDomain.ts` 按关键词匹配五领域，默认「科学」
- **备选**：固定传第一个已选领域 — 与周计划单元格文本无关，放弃

### Decision 3: URL 参数

- **选择**：mount 时读 `useSearchParams` 一次写入 theme/domain，不监听后续变化
- **备选**：持续 sync — 与用户手动编辑冲突

## 组件

| 文件 | 职责 |
|------|------|
| `ActivityPlanPreview.tsx` | 空态 / 多方案 Tab / 文档式 title·domain·objectives·content |
| `WeekBoard.tsx` | 五列日计划 + 集体教学跳转按钮 |
| `inferFocusDomain.ts` | 从活动标题文本推断 FocusDomain |

## Risks

- 时长仅追加到 prompt 补充说明，不写入 TeachingPlan 模型 — 可接受，Phase 1 UI 需求
- 看板 + PlanEditor 双视图可能冗余 — 看板强调导航闭环，Editor 保留精细编辑
