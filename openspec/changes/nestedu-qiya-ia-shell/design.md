# Design: nestedu-qiya-ia-shell

## 路由

| Path | Component | 说明 |
|------|-----------|------|
| `/` | dashboard | 首页，更新快捷入口 |
| `/activity` | resources（现有） | Phase 0 复用教案页 |
| `/resources` | Navigate → `/activity` | 兼容旧链接 |
| `/weekly-plan` | weekly-plan | 不变 |
| `/archive` | archive placeholder | Phase 2 |
| `/profile` | profile placeholder | Phase 3 |

## 导航激活规则

- `/` 精确匹配
- 其余前缀匹配（含子路径）
- `/activity` 与旧 `/resources` 重定向后均高亮「活动方案」

## 非目标（本 change）

- 不改教案/周计划生成逻辑
- 不实现成果库 CRUD、画像聚合
- 不整页移植 preview HTML
