# 架构说明（MVP Template）

本模板采用前后端同仓协作，并保持技术边界独立。

## 目录分层

- `apps/web/`：前端应用（React + Vite）
- `apps/api/`：后端服务（Go + Gin），可独立运行，也可在 Docker 镜像内托管前端静态资源
- `docs/`：架构与接口契约文档
- `openspec/`：需求变更规范管理
- `scripts/`：统一开发/构建/CI 脚本

## 前端边界

- 页面层只调用 `apps/web/src/api/*`，禁止在页面中直接写 `axios/fetch`。
- API 地址、超时、拦截器统一在 `apps/web/src/api/client.ts`。
- 业务 API 按域拆分，例如 `sample.ts`、`user.ts`、`order.ts`。

## 后端边界

- `internal/http` 负责路由、中间件、参数读取和响应编码。
- `internal/service` 负责业务编排、规则校验和跨 store 组合。
- `internal/store` 负责持久化、查询和模型集合。
- `internal/model` 负责数据模型定义。
- `cmd/server/main.go` 只负责加载配置、初始化依赖和启动服务。
- 不依赖 `center/edu` 主项目代码包，独立构建与部署。

## 与 center 的对齐点

- 接口前缀保持 `/api/...`。
- JSON 响应保持 `success/result/errorMessage` 风格。
- 环境配置提供 `.env.example`，变量命名保持可迁移。
- 使用 OpenSpec 管理中大型变更。
- 通过 `scripts/ci.sh` 固化最低质量门槛（lint/web build/backend test/backend build）。
