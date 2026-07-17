# mvp-template backend

后端模板服务（Go + Gin），默认提供：

- `GET /healthz`
- `GET /api/v1/sample/items`
- `POST /api/v1/sample/items`

## 运行

```bash
cd apps/api
go mod tidy
# copy .env.example to .env and fill values
go run ./cmd/server
```

说明：
- 服务会按顺序加载根目录 `.env`、`apps/api/.env`、根目录 `.env.local`、`apps/api/.env.local`（后者覆盖前者）。
- 支持 `[app]` 这类分段标题行，和 center 的 env 风格一致。

## 必需环境变量

```bash
SERVER_ADDR=:8088

DB_DRIVER=postgres
DB_DSN=postgres://user:pass@127.0.0.1:5432/mvp_template?sslmode=disable
```

## 可选环境变量

```bash
DB_AUTO_MIGRATE=true
SAMPLE_TABLE_NAME=sample_items
WEB_STATIC_DIR=/app/bin/dist
WEB_BASE_PATH=
```
