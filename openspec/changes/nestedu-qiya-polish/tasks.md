## 1. OpenSpec

- [x] 1.1 创建 `nestedu-qiya-polish` change 目录与四件套

## 2. 首页仪表盘

- [x] 2.1 并行加载成果库与知识库计数
- [x] 2.2 紧凑统计行（活动方案、周计划、录入、代表成果）
- [x] 2.3 个人成长闭环四步入口
- [x] 2.4 加载态与知识库软失败（未登录提示）

## 3. 移动端布局

- [x] 3.1 `max-md` 隐藏桌面侧栏，底部五入口导航
- [x] 3.2 主内容 `pb-20`、顶栏全宽、折叠仅桌面
- [x] 3.3 导航无障碍（`aria-current`、`aria-label`）

## 4. 文档

- [x] 4.1 README 产品描述与路由表更新
- [x] 4.2 `docs/api-contract.md` Growth Records API
- [x] 4.3 AGENTS.md Phase 状态轻量更新

## 5. 验证

- [x] 5.1 `pnpm --filter ./apps/web build`
- [x] 5.2 `cd apps/api && go test ./...`
- [x] 5.3 CI 或等价 lint + build + test（Windows：lint 有既有告警；build:web + test:backend + build:backend 通过）
