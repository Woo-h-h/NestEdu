# Proposal: NestEdu 智能体评测集 v1

## Why

活动方案、周计划、成果解析、教师画像四条生成链路目前只有运行时 JSON 校验，换 Prompt 或 Agent 后无法回归。需要一份版本化、可自动打分的评测集，先覆盖结构与硬约束，再扩展内容质量。

## What Changes

- 新增 `evals/datasets/v1/`：四任务 jsonl（输入 + 可执行约束，不做全文金标）
- 新增离线 Runner / 打分器：复用教案/周计划 schema 规则、画像禁词与忠实度检查
- 用少量 fixture 输出锁住打分器行为，`node evals/run.mjs` 可在无平台 Token 时跑通
- 本阶段不接线上智能体实跑（避免鉴权与费用绑死 CI）

## Impact

- 前端：不改页面主链路；校验逻辑与 `weeklyPlanValidators` 对齐（评测侧独立实现以便 Node 直跑）
- 后端：无
- 接口：无
- 数据：评测集为脱敏虚构样本，不含真实教师手机号与证件
- 风险：打分器与线上 validator 漂移；用 fixture 和注释约束「与 `weeklyPlanValidators.ts` 对齐」缓解
