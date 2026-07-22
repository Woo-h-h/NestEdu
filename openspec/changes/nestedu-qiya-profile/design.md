# Design: nestedu-qiya-profile

## 聚合输入

| 来源 | 字段 | 说明 |
|------|------|------|
| 教师录入 | `GrowthRecord[]` | 成果库 CRUD 数据 |
| 系统占位 | `{ activityPlans?, weeklyPlans? }` | 默认 0；后续接知识库计数 |

## 成长维度（结构观察，非能力评分）

| ID | 标签 | 计数规则 |
|----|------|----------|
| `activity` | 保教活动设计与实施 | `activityPlans + weeklyPlans` |
| `research` | 专业学习与园本研究 | 专业研究成果 + 学习与研修 |
| `contribution` | 园本资源与协同贡献 | 获奖与荣誉（实践/协同 hint） |

雷达值 `buildRadarValues`：按各维记录量映射 0–100 **结构丰富度**，文案统一称「成长结构观察」。

## 优劣势规则引擎（MVP，无 Agent）

可解释规则示例：

- 某录入类 count ≥ 2 且为最高 → strengths
- 某录入类 count = 0 且另有录入 → gaps
- 无代表成果标记 → gap 建议
- 跨年度记录 ≥ 2 → strength 持续积累

每条输出 `{ title, text, evidence, source }`。

## 行动建议

- localStorage key：`nestedu_profile_actions_v1`
- 结构：`Record<actionId, { checked, status, date, progress }>`
- 默认种子由 `buildDefaultActionSeeds(gaps)` 生成，用户勾选/日期/进度本地持久化

## 年度报告

- `AnnualReportModal`：与页面共用 `useProfileMetrics` 数据
- 打印：`window.print()` + `@media print` + `body.printing` 隐藏 chrome
- 页脚数据说明与合规声明

## 图表

纯 SVG React 组件：`RadarChart`、`TrendChart`、`DonutChart` — 不引入 recharts/chart.js。

## 非目标

- 教师排名、绩效分、跨人对比
- Agent 润色画像文案
- 后端 profile 快照 API（可 Phase 4）
