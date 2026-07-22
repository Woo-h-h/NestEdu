# Proposal: NestEdu 教师画像与年度报告（Phase 3）

## Why

Phase 2 成果库已提供教师录入数据；画像页 Phase 0 仅为占位。需将系统生成计数（占位）与教师录入成果聚合为可解释的成长结构，支持行动建议本地持久化与年度报告打印，且文案合规（不排名、不绩效分）。

## What Changes

- 纯函数库 `lib/profile-metrics.ts`：维度、雷达结构值、趋势、优劣势规则引擎、词云、成长路径
- 行动建议 `lib/profile-actions.ts` + `hooks/useProfileMetrics.ts`（localStorage）
- 组件：`components/profile/*`（SVG 图表，无重 chart 依赖）
- 页面：`pages/profile/index.tsx` 替换占位；`AnnualReportModal` 打印/PDF
- 空态与合规声明可见

## Impact

- 前端：`apps/web/src/{lib,hooks,components/profile,pages/profile}`
- 后端：无必须改动（可选后续 `profile_service` 缓存快照）
- 数据：画像由 `listGrowthRecords` + 可选 systemStats 占位实时计算
- 风险：系统统计待接入时雷达「保教活动」维可能偏低，需在 UI 标注来源
