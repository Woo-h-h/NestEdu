# Design: nestedu-qiya-archive

## 数据模型

表 `growth_records`，主键 `id`（text），按 `owner_id` 隔离（同 weekly_plans）。

JSON 列（text 存储）：

- `keywords`：`[]string`
- `files`：`[{name,type,size}]` — MVP 无实际上传
- `extra`：类别专属字段 `map[string]any`

## API

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/v1/growth-records` | 列表（可选 query: year, category, level, status, keyword） |
| GET | `/api/v1/growth-records/:id` | 详情 |
| POST | `/api/v1/growth-records` | 创建/upsert |
| PUT | `/api/v1/growth-records/:id` | 更新 |
| DELETE | `/api/v1/growth-records/:id` | 删除 |

Owner：`X-Uid-Hash` / `X-Uid` / `X-User-Id`，缺省 `anonymous`。

响应：`{ success, result }` 与现有 BFF 一致。

## 前端降级

`VITE_USE_BACKEND_API=false` 或未配置 BFF 时，`localStorage` key `nestedu_growth_records_v1`。

## 类别

| Category | 子类型示例 | Extra 字段 |
|----------|-----------|------------|
| 专业研究成果 | 论文/课题/案例… | publication, volume, doi |
| 获奖与荣誉 | 教学比赛/综合荣誉… | awardName, rank |
| 学习与研修 | 培训/证书… | hours, certificateNo |

## 非目标

- 附件对象存储、OCR 自动填表
- 教师画像聚合（Phase 3）
- 系统生成成果自动写入 growth_records（仍走知识库计数，UI 占位）
