## 1. API 与契约

- [ ] 1.1 明确请求/响应字段并更新 `docs/api-contract.md`
- [ ] 1.2 完成 `internal/http` 路由注册、请求解析与响应编码

## 2. 后端实现

- [ ] 2.1 在 `internal/service` 完成核心业务逻辑与错误处理
- [ ] 2.2 在 `internal/store` 完成持久化读写
- [ ] 2.3 补充最小后端测试

## 3. 前端实现

- [ ] 3.1 在 `apps/web/src/api/*` 增加接口封装与类型
- [ ] 3.2 将请求状态放入 `hooks/`，展示规则或错误解析放入 `lib/`
- [ ] 3.3 页面接入并完成交互状态处理

## 4. 验证

- [ ] 4.1 `pnpm lint`
- [ ] 4.2 `pnpm build:web`
- [ ] 4.3 `pnpm test:backend`
- [ ] 4.4 `pnpm build:backend`
- [ ] 4.5 联调与手测记录
