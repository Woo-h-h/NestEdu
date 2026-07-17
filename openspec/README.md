# OpenSpec 使用说明（mvp-template）

本目录用于管理需求变更的规格化流程，默认采用 `spec-driven` 模式。

## 目录约定

```text
openspec/
├── config.yaml
├── specs/
│   └── <capability>/current/spec.md
└── changes/
    ├── _template/
    └── <change-id>/
        ├── .openspec.yaml
        ├── proposal.md
        ├── design.md
        └── tasks.md
```

## 快速开始

### 1) 创建一个变更骨架

```bash
./scripts/openspec-new-change.sh sample-item-filter
```

### 2) 补全三个核心文档

- `proposal.md`
- `design.md`
- `tasks.md`

### 3) 开发时按 tasks 勾选推进

开发完成后，按需更新 `openspec/specs/*/current/spec.md`。

## change-id 命名建议

- 使用小写短横线
- 表达“业务对象 + 动作”
- 示例：
  - `sample-item-filter`
  - `user-login-hardening`
  - `dashboard-export-csv`

## 提交前最小检查

- OpenSpec 文档与实现保持一致
- `pnpm run ci` 通过
- API 契约文档（`docs/api-contract.md`）已更新（如有变更）
