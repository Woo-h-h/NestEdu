#!/usr/bin/env bash
set -euo pipefail

pnpm build:web
pnpm build:backend
