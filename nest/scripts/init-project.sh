#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <project-name>"
  echo "Example: $0 your-project-name"
  exit 1
fi

PROJECT_NAME="$1"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! "$PROJECT_NAME" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "Invalid project name: $PROJECT_NAME"
  echo "Allowed chars: letters, numbers, dot, underscore, hyphen"
  exit 1
fi

replace_in_file() {
  local file="$1"
  local from="$2"
  local to="$3"

  if [ ! -f "$file" ]; then
    return 0
  fi

  sed -i.bak "s|${from}|${to}|g" "$file"
  rm -f "$file.bak"
}

replace_in_file "$ROOT_DIR/package.json" "mvp-template-root" "${PROJECT_NAME}-root"
replace_in_file "$ROOT_DIR/apps/web/package.json" "mvp-template-web" "${PROJECT_NAME}-web"
replace_in_file "$ROOT_DIR/apps/api/go.mod" "github.com/your-org/mvp-template/apps/api" "github.com/your-org/${PROJECT_NAME}/apps/api"
replace_in_file "$ROOT_DIR/README.md" "# mvp-template" "# ${PROJECT_NAME}"
replace_in_file "$ROOT_DIR/openspec/config.yaml" "Project: mvp-template" "Project: ${PROJECT_NAME}"
replace_in_file "$ROOT_DIR/AGENTS.md" "mvp-template" "${PROJECT_NAME}"

echo "Project initialized with name: $PROJECT_NAME"
echo "Updated files:"
echo "  - package.json"
echo "  - apps/web/package.json"
echo "  - apps/api/go.mod"
echo "  - README.md"
echo "  - openspec/config.yaml"
