# Commit Message 规范

## 语言

- 默认使用中文编写 commit message
- 仅当用户明确要求英文或遵循外部仓库规范时，才使用英文

## 格式

commit message 默认采用以下格式，便于日报、周报和代码审核复用：

```text
英文短语(模块): 中文更新主体

业务说明：
- 面向日报、周报和非技术协作方，用业务语言说明本次解决了什么问题、带来什么效果。
- 避免堆文件名、函数名、doc_id、内部实现细节。

技术说明：
- 面向代码审查和后续维护，说明核心改动范围、关键实现边界、风险点。
- 如涉及 spec、migration、接口、数据兼容或重建流程，必须写清楚。
```

`scope` 可省略：

```text
英文短语: 中文更新主体
```

## 英文短语（type）

优先使用：

- `feat`：新增能力或用户可见功能
- `fix`：修复缺陷
- `docs`：文档和规范
- `refactor`：不改变行为的结构调整
- `test`：测试
- `chore`：清理、维护性事务
- `perf`：性能优化

其他常见 type：

- `build`：依赖、构建、包管理、Docker、工具链

## 模块（scope）

使用稳定模块名，例如：

- `api`
- `web` / `frontend`
- `docs`
- `openspec`
- `docker`
- `deps`
- `knowledge`
- `ai`

## 中文更新主体

- 使用中文短句作为主题
- 用动宾结构
- 不加句号
- 主题控制在一行内

## 正文说明

- 小型纯文档或低风险改动可以简化正文，但涉及业务逻辑、检索、数据结构、接口、spec 或重建流程时，不应省略「业务说明」和「技术说明」两段

## 示例

```text
refactor(api): 拆分 sample 服务分层

业务说明：
- 将 sample 相关逻辑从 handler 中拆出，便于后续扩展业务接口而不影响路由层。

技术说明：
- 新增 internal/service/sample 与 internal/store/sample，handler 仅做请求解析与响应编码。
```

```text
docs(openspec): 同步模板任务约定

业务说明：
- 统一 OpenSpec 变更流程说明，降低新项目上手成本。

技术说明：
- 更新 openspec/README.md 与 AGENTS.md 中的任务勾选约定。
```

```text
build(deps): 升级前后端依赖
```
