# Design: nestedu-qiya-polish

## 首页统计

并行 `Promise.allSettled`：

| 数据源 | API | 展示 |
|--------|-----|------|
| 活动方案 | `fetchKnowledgePlans({ limit: 50, fallbackPreset: false })` | 知识库教案分类文档数 |
| 周计划 | `fetchKnowledgePlans({ limit: 50, fallbackPreset: false, ...weeklyPlanKnowledgeScope() })` | 知识库周计划分类文档数 |
| 教师录入 | `listGrowthRecords()` | 录入条数 |
| 代表成果 | `listGrowthRecords()` 过滤 `representative` | 代表成果数 |

加载态：`—` 或 skeleton；知识库鉴权失败软失败显示 `—` 并提示需登录；禁止伪造观察记录/园本资源计数。

## 个人成长闭环

四步按钮链：`/activity` → `/archive` → `/profile` → `/archive/upload`（录入补充）。

## 移动端导航

| 断点 | 行为 |
|------|------|
| `< md` | 隐藏左侧栏；`fixed` 底部五入口（图标 + 短标签）；`main` 增加 `pb-20`；顶栏全宽 |
| `≥ md` | 保留现有侧栏与折叠；「不排名」说明仅在侧栏展开时显示 |

底部导航 `aria-label="主要导航"`；当前路由 `aria-current="page"`。

## 非目标

- 不新增 EmptyHint 共享组件（可选跳过）
- 不改成果库/画像业务逻辑
- 不接入无真实数据源的平台统计项
