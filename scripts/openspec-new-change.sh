#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <change-id>"
  echo "Example: $0 sample-item-filter"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CHANGE_ID="$1"
CHANGE_DIR="$ROOT_DIR/openspec/changes/$CHANGE_ID"
TEMPLATE_DIR="$ROOT_DIR/openspec/changes/_template"
TODAY="$(date +%F)"

if [ -d "$CHANGE_DIR" ]; then
  echo "Change already exists: $CHANGE_DIR"
  exit 1
fi

mkdir -p "$CHANGE_DIR"

cp "$TEMPLATE_DIR/proposal.md" "$CHANGE_DIR/proposal.md"
cp "$TEMPLATE_DIR/design.md" "$CHANGE_DIR/design.md"
cp "$TEMPLATE_DIR/tasks.md" "$CHANGE_DIR/tasks.md"

cat > "$CHANGE_DIR/.openspec.yaml" <<EOF2
schema: spec-driven
created: $TODAY
EOF2

echo "Created OpenSpec change scaffold:"
echo "  - $CHANGE_DIR/.openspec.yaml"
echo "  - $CHANGE_DIR/proposal.md"
echo "  - $CHANGE_DIR/design.md"
echo "  - $CHANGE_DIR/tasks.md"
echo
echo "Next:"
echo "  1) Fill proposal/design/tasks"
echo "  2) Implement by tasks order"
echo "  3) Update openspec/specs/*/current/spec.md if behavior stabilized"
