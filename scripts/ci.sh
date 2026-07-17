#!/usr/bin/env bash
set -euo pipefail

pnpm lint
pnpm build:web
pnpm test:backend
pnpm build:backend
