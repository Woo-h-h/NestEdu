# 旧项目升级指南

这份文档用于把已有旧代码的项目升级到新版 `mvp-template` 结构。

核心原则：

- 旧代码先归档，不在原地修补
- 新模板作为项目根目录基线
- 从归档代码按业务切片迁移
- 迁移后的代码必须落到新版分层
- 每个切片都要可验证

## 1. 适用场景

适用于这些情况：

- 项目已经有一版旧前端或旧后端
- 旧项目目录结构和新版模板不一致
- 旧代码中存在业务逻辑混在页面、handler、临时工具函数里的情况
- 需要保留旧实现作为对照，但后续要按新版模板继续开发

不适用于：

- 全新项目。全新项目需基于模板仓库创建后，按 `docs/mvp-template-usage-guide.md` 初始化。
- 只改一两个配置的小变更。小变更不需要做归档迁移。

## 2. 归档旧代码

在升级前，先把旧代码整体移动到：

```text
archive/v1/
```

示例：

```bash
mkdir -p archive/v1
mv old-web old-api old-docs archive/v1/
```

如果旧项目本来就在根目录，不要盲目 `mv * archive/v1/`。先确认不会移动 `.git`、新模板文件、环境文件或运行数据。

建议归档后保留一份说明：

```text
archive/v1/README.md
```

内容至少写清楚：

- 旧版本主要功能
- 前端启动方式
- 后端启动方式
- 旧接口列表
- 已知问题
- 迁移时必须保留的业务规则

## 3. 建立新版模板基线

把新版 `mvp-template` 文件放到项目根目录后，先完成初始化：

```bash
./scripts/init-project.sh <project-name>
pnpm install
```

确认新版基线可运行：

```bash
pnpm run ci
```

如果此时 CI 不通过，先修模板基线，不要开始迁移业务。

## 4. 挂载模板仓库

新项目通常是基于模板仓库再创建独立的仓库，不是正式 fork，但 `master` 分支和模板仓库有共同历史。

本地 clone 新项目后，建议额外挂载模板仓库 remote：

```bash
git remote add template git@codeup.aliyun.com:62a3fefa11fc0f0c9e2a654a/mvp/template_web.git
git fetch template
```

remote 语义：

- `origin`
  - 当前业务项目自己的仓库
- `template`
  - MVP 模板仓库，用于拉取、对比和吸收模板更新

同步模板更新前，先拉取模板，再用 AI 编程工具对照 `template/master`，梳理本项目可能漏掉的同步项。不要只看 `git diff` 输出就合并。

```bash
git fetch template
```

在 Cursor、Codex 等工具中，基于当前分支与 `template/master` 做对比，重点看 CI/脚本、目录约定、通用配置、文档与 `AGENTS.md` 等工程化改动。示例提示词：

```text
我已执行 git fetch template。请对比当前项目与 template/master，
列出模板侧有、本项目尚未同步的改动（按文件或主题分组），
并说明每项是否建议吸收及原因；先给清单，不要直接 merge。
```

可用 `git log master..template/master --oneline` 与 `git diff master..template/master --stat` 作快速概览，但以 AI 对照清单为准。确认影响范围后，可以按实际情况选择：

```bash
git merge template/master
```

或只吸收特定模板提交：

```bash
git cherry-pick <template-commit>
```

每次吸收模板更新都应单独提交，不要和业务功能混在一起。如果当前业务分支不是从 `master` 派生，先确认它和模板仓库是否仍有共同历史，再决定是否合并。

## 5. 盘点旧系统

迁移前先从 `archive/v1` 提取清单：

- 页面和主要用户流程
- API 路由和请求/响应字段
- 数据表或存储文件
- 鉴权、上传、支付、通知等外部依赖
- 定时任务、脚本和部署入口
- 旧系统中隐含的业务规则

建议把盘点结果写到 OpenSpec change：

```bash
./scripts/openspec-new-change.sh migrate-legacy-v1
```

## 6. 按业务切片迁移

不要把 `archive/v1` 的代码直接复制回根目录。

每次只迁一个可验证切片，例如：

- 登录
- 用户列表
- 商品列表
- 创建订单
- 文件上传

每个切片按新版结构落位。

### 后端落位

- `internal/http`
  - 路由注册
  - 请求解析
  - 响应编码
  - HTTP 状态码
- `internal/service`
  - 业务规则
  - 流程编排
  - 跨 store 组合
- `internal/store`
  - 数据库读写
  - 文件读写
  - 外部持久化适配
- `internal/model`
  - 数据模型

禁止把旧 handler 整段搬回来。

### 前端落位

- `pages/`
  - 页面装配
- `components/`
  - 可复用 UI 和局部交互
- `hooks/`
  - 请求生命周期、状态、持久化
- `lib/`
  - 展示规则、格式化、错误解析、纯函数
- `api/`
  - API client、接口封装和接口类型

禁止把旧页面整段搬回来后继续堆逻辑。

## 7. API 迁移约定

新版接口统一使用：

```text
/api/v1/...
```

迁移接口时同步更新：

- `docs/api-contract.md`
- 前端 `apps/web/src/api/*`
- 后端 HTTP 路由测试

如果必须保留旧路径兼容，应明确写在 OpenSpec 设计里，并标注移除计划。

## 8. 验证要求

每迁完一个切片，至少跑：

```bash
pnpm run ci
```

后端切片应优先补：

- service 测试
- HTTP 路由测试

前端切片至少手测：

- 页面可打开
- 成功状态
- 失败状态
- 空状态
- loading 状态

## 9. 完成标准

迁移完成时应满足：

- 新业务代码不依赖 `archive/v1`
- `archive/v1` 只作为历史参考存在
- `pnpm run ci` 通过
- Docker 镜像可构建
- API 契约文档已同步
- OpenSpec tasks 已勾选完成

最终可保留 `archive/v1`，也可在确认不再需要后单独归档到外部存储。删除旧代码应单独提交，不要和业务迁移混在一起。
