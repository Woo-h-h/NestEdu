# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24-alpine
ARG GOLANG_IMAGE=golang:1.25-alpine
ARG GOPROXY=https://goproxy.cn,direct
ARG GOSUMDB=sum.golang.google.cn

FROM ${NODE_IMAGE} AS web
ARG VITE_BASE_PATH=
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.2 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web ./apps/web
ENV VITE_BASE_PATH=${VITE_BASE_PATH}
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
ENV DB_DRIVER=sqlite
ENV DB_DSN=/app/data/mvp.db
ENV DB_AUTO_MIGRATE=true
CMD ["mvp-api"]
