# YRY_Agent 归档对照

## 源路径

`D:\Work\YRY_Agent`

## 主要功能

- 周计划生成（上传 docx / 选择教案 → DeepSeek 生成）
- 周计划表格编辑、AI 对话改稿
- 历史记录（localStorage）
- DOC / PDF 导出
- ZCAT 平台 SSO（Phase A，**不迁入 nest**，改用 auth-bridge）

## 启动方式（旧项目）

```bash
cd D:\Work\YRY_Agent\apps\web
pnpm install
pnpm dev
```

## 已知限制

- 无自有后端，周计划存 localStorage
- DeepSeek API Key 在浏览器直连（Phase B 已迁入 nest 后端代理）
- 课程库 / 教研页为占位

## 迁移保留的业务规则

- 周计划 8 行 × 5 列表格结构
- 五大领域标注、区域游戏关联主题
- LLM 输出 JSON 格式校验与重试
- 无 API Key 时降级 Mock

## 迁移目标落位

见 `openspec/changes/migrate-weekly-plan-fe` 与 `migrate-weekly-plan-api`。
