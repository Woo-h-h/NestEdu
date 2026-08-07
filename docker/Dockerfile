# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24-alpine
ARG GOLANG_IMAGE=golang:1.25-alpine
ARG GOPROXY=https://goproxy.cn,direct
ARG GOSUMDB=sum.golang.google.cn

FROM ${NODE_IMAGE} AS web
ARG VITE_BASE_PATH=
ARG VITE_DEFAULT_KNOWLEDGE_ID=10298
ARG VITE_DEFAULT_KNOWLEDGE_CATEGORY_ID=20806
ARG VITE_DEFAULT_KNOWLEDGE_CATEGORY_KEY=custom_1784259353619
ARG VITE_PLATFORM_API_BASE_URL=https://api.zcat.cn
ARG VITE_PLATFORM_REFERER=https://www.zcat.cn
ARG VITE_TEACHING_AGENT_ID=14317
ARG VITE_WEEKLY_PLAN_AGENT_ID=14332
ARG VITE_PROFILE_AGENT_ID=14372
ARG VITE_ARCHIVE_KNOWLEDGE_CATEGORY_ID=20895
ARG VITE_ARCHIVE_KNOWLEDGE_CATEGORY_KEY=custom_1785116184487
ARG VITE_APP_VERSION=0.1.0
# 不传则由 Vite 构建时自动生成 UTC 时间戳
ARG VITE_APP_BUILD_ID=
WORKDIR /app
# corepack 默认打 registry.npmjs.org，国内 CI 易 BodyTimeout；改用 npmmirror 安装固定版 pnpm
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV npm_config_registry=${NPM_REGISTRY}
RUN npm install -g pnpm@11.1.2 \
  && pnpm config set registry "${NPM_REGISTRY}"
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web ./apps/web
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
ENV VITE_DEFAULT_KNOWLEDGE_ID=${VITE_DEFAULT_KNOWLEDGE_ID}
ENV VITE_DEFAULT_KNOWLEDGE_CATEGORY_ID=${VITE_DEFAULT_KNOWLEDGE_CATEGORY_ID}
ENV VITE_DEFAULT_KNOWLEDGE_CATEGORY_KEY=${VITE_DEFAULT_KNOWLEDGE_CATEGORY_KEY}
ENV VITE_PLATFORM_API_BASE_URL=${VITE_PLATFORM_API_BASE_URL}
ENV VITE_PLATFORM_REFERER=${VITE_PLATFORM_REFERER}
ENV VITE_TEACHING_AGENT_ID=${VITE_TEACHING_AGENT_ID}
ENV VITE_WEEKLY_PLAN_AGENT_ID=${VITE_WEEKLY_PLAN_AGENT_ID}
ENV VITE_PROFILE_AGENT_ID=${VITE_PROFILE_AGENT_ID}
ENV VITE_ARCHIVE_KNOWLEDGE_CATEGORY_ID=${VITE_ARCHIVE_KNOWLEDGE_CATEGORY_ID}
ENV VITE_ARCHIVE_KNOWLEDGE_CATEGORY_KEY=${VITE_ARCHIVE_KNOWLEDGE_CATEGORY_KEY}
ENV VITE_APP_VERSION=${VITE_APP_VERSION}
ENV VITE_APP_BUILD_ID=${VITE_APP_BUILD_ID}
RUN pnpm --filter ./apps/web build

FROM ${GOLANG_IMAGE} AS api-builder
ARG GOPROXY
ARG GOSUMDB
ENV GOPROXY=${GOPROXY} GOSUMDB=${GOSUMDB}
WORKDIR /src/apps/api
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk add --no-cache build-base
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api ./
RUN go build -trimpath -ldflags="-s -w" -o /out/mvp-api ./cmd/server

FROM alpine:3.20
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk add --no-cache ca-certificates tzdata \
    && mkdir -p /app/data
WORKDIR /app
COPY --from=api-builder /out/mvp-api /usr/local/bin/mvp-api
COPY --from=web /app/apps/web/dist ./bin/dist
EXPOSE 8088
ENV SERVER_ADDR=:8088
ENV WEB_STATIC_DIR=/app/bin/dist
ENV WEB_BASE_PATH=
ENV GIN_MODE=release
# 默认 SQLite 仅作无外部库时的兜底；生产请用编排/云效注入 DB_DRIVER+DB_DSN（推荐 Postgres RDS）
ENV DB_DRIVER=sqlite
ENV DB_DSN=/app/data/mvp.db
ENV DB_AUTO_MIGRATE=true
CMD ["mvp-api"]
