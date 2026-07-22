## 1. 规格与核心库

- [x] 1.1 OpenSpec `nestedu-qiya-profile`
- [x] 1.2 `lib/profile-metrics.ts` 纯函数聚合
- [x] 1.3 `lib/profile-actions.ts` localStorage 持久化

## 2. 前端装配

- [x] 2.1 `hooks/useProfileMetrics.ts`
- [x] 2.2 `components/profile/*` 图表与面板
- [x] 2.3 `pages/profile/index.tsx` 完整布局
- [x] 2.4 `AnnualReportModal` 打印样式

## 3. 验证

- [ ] 3.1 空态 / 有数据态手动走查
- [x] 3.2 `pnpm --filter ./apps/web build`
