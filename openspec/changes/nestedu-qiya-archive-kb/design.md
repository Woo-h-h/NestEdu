# Design: nestedu-qiya-archive-kb

## 数据源

| 分区 | 来源 | 说明 |
|------|------|------|
| 平台 · 教师成果库 | AI101 KB `10298` 指定分类 | 列表/详情/上传/删除，镜像周计划知识库管理 |
| 教师录入 | growth-records（BFF 或 localStorage） | 既有 CRUD 不变 |

## 配置

```text
VITE_ARCHIVE_KNOWLEDGE_CATEGORY_ID=20895
VITE_ARCHIVE_KNOWLEDGE_CATEGORY_KEY=custom_1785116184487
```

知识库 ID 复用 `VITE_DEFAULT_KNOWLEDGE_ID`（默认 10298）。
分类链接：[教师成果库](https://www.zcat.cn/teach/knowledge/detail/10298?category_id=20895&category_key=custom_1785116184487)

## 复用

- `fetchKnowledgePlans` / `uploadKnowledgeDocument` / `deleteKnowledgeDocument`
- `PlanManageList` + `PlanDetailDialog` + `UploadConfirmDialog`
- Hook 模式对齐 `useWeeklyPlanKnowledge`
