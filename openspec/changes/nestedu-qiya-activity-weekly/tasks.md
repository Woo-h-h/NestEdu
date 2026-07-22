## 1. OpenSpec 与契约

- [x] 1.1 创建 `nestedu-qiya-activity-weekly` change（proposal / design / tasks）
- [x] 1.2 教案生成 prompt 支持 `notes`（含活动时长拼接）

## 2. 活动方案工作台

- [x] 2.1 左右布局：班级、领域 chip、主题、时长、重点关注
- [x] 2.2 右侧文档预览（空态 / 多方案切换）
- [x] 2.3 保留「活动方案生成 | 知识库管理」Tab 与入库流程
- [x] 2.4 URL `topic` / `domain` 参数预填
- [x] 2.5 文案改为单次活动 / 活动方案

## 3. 周计划看板

- [x] 3.1 新增 `WeekBoard.tsx`（Mon–Fri 四行字段）
- [x] 3.2 集体教学「生成详细方案」跳转活动方案
- [x] 3.3 `create/index.tsx` 生成后展示看板 + PlanEditor
- [x] 3.4 页标题改为「周计划」；工具栏说明活动与周计划关联

## 4. 验证

- [x] 4.1 `pnpm --filter ./apps/web build`
- [ ] 4.2 手测：生成/上传/登录/周计划→活动跳转
