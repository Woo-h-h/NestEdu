# Design: NestEdu 智能体评测集 v1

## Context

生成入口在 `apps/web/src/api/llm.ts`、`archiveParseAgent.ts`、`profileAgent.ts`。运行时已有 `isValidTeachingPlan` / `isValidWeeklyPlan` 与画像禁排名约束，但没有固定样本集。

## Goals / Non-Goals

### Goals

- 四任务评测集：teaching / weekly-plan / archive-parse / profile
- 每条样本：`id + task + split + input + expect + constraints`
- 规则打分可重复；CI 只跑 fixture，不调用 AI101
- 评测必须有终止条件：单条超时不适用离线分；实跑若后续接入须沿用 90s/120s

### Non-Goals

- LLM-as-Judge、教师两两对比、绩效分
- 本阶段用用户 Token 批量打线上 Agent
- 把评测接到教师页面

## Decisions

### Decision 1: 评测目录独立于 Vite 应用

- 选择：仓库根目录 `evals/`，Node ESM 直跑，不引入 tsx/vitest
- 备选：放进 `apps/web` 用路径别名导入 validator
- 放弃原因：`@/` 别名无法被 Node 直接 import；评测不应依赖浏览器鉴权

### Decision 2: 金标写约束不写全文

- 选择：`expect` 只含份数、领域顺序、须保留教案标题、禁词、必备 Markdown 标题
- 备选：每条存完整标准教案
- 放弃原因：维护成本高、抑制合理多样表述

### Decision 3: 先 fixture 后实跑

- 选择：`evals/fixtures/v1/` 提供正/负输出，Runner 校验 `expectPass`
- 备选：CI 调 `/v1/text/generate`
- 放弃原因：无稳定 Token、费用、结果不可复现

## Risks / Trade-offs

- 打分器与前端 validator 分叉 → 注释标明同步点，规则保持同构
- 样本过少导致虚假安心 → v1 先覆盖 core/edge/neg 矩阵， hol dout 留到 v2
