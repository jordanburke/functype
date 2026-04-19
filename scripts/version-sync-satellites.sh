#!/usr/bin/env bash
#
# Sync satellite files (mcp-server/package.json, site/public/llms-full.txt) to
# the current root package.json version. Stages the changes for git but does
# NOT commit/tag — designed to be invoked from the npm `version` lifecycle
# script so the satellites ride along with the automatic version commit.
#
# Without this hook, `npm version <level>` silently leaves satellites behind,
# and scripts/version-check.sh (pre-validate) fails in CI.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=$(node -p "require('$ROOT_DIR/package.json').version")

cd "$ROOT_DIR/mcp-server"
npm pkg set version="$VERSION"

cd "$ROOT_DIR"
LLMS_FILE="$ROOT_DIR/site/public/llms-full.txt"
if [ -f "$LLMS_FILE" ]; then
  sed -i.bak "1s/# Functype v.*/# Functype v$VERSION/" "$LLMS_FILE"
  rm "$LLMS_FILE.bak"
fi

git add mcp-server/package.json "$LLMS_FILE"
echo "Synced satellites to v$VERSION"
