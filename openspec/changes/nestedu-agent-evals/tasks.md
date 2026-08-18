## 1. 规格与目录

- [x] 1.1 确认四任务样本字段与约束名
- [x] 1.2 建立 `evals/` 与 OpenSpec `nestedu-agent-evals`

## 2. 评测集

- [x] 2.1 `teaching.jsonl`（core / edge / neg）
- [x] 2.2 `weekly-plan.jsonl`
- [x] 2.3 `archive-parse.jsonl`
- [x] 2.4 `profile.jsonl`（含空材料与禁编造）

## 3. 打分与 Runner

- [x] 3.1 schema / 约束打分（对齐现有 validator）
- [x] 3.2 `evals/run.mjs`：列出样本、按 fixture 打分、失败非 0
- [x] 3.3 正/负 fixture 锁打分器

## 4. 文档与验证

- [x] 4.1 `evals/README.md` + 根 README / CHANGELOG
- [ ] 4.2 `node evals/run.mjs` 通过
