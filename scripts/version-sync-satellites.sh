#!/usr/bin/env bash
#
# Sync satellite files (mcp-server/package.json, mcp-server/server.json,
# site/public/llms-full.txt) to the current root package.json version. Stages
# the changes for git but does NOT commit/tag — designed to be invoked from
# the npm `version` lifecycle script so the satellites ride along with the
# automatic version commit.
#
# Without this hook, `npm version <level>` silently leaves satellites behind,
# and scripts/version-check.sh (pre-validate) fails in CI.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VERSION=$(node -p "require('$ROOT_DIR/package.json').version")

cd "$ROOT_DIR/mcp-server"
npm pkg set version="$VERSION"

# server.json is the MCP registry manifest. Update both the top-level
# version and packages[0].version. Use node so we round-trip the JSON
# safely (preserves key order, no jq dependency).
SERVER_JSON="$ROOT_DIR/mcp-server/server.json"
if [ -f "$SERVER_JSON" ]; then
  node -e "
    const fs = require('fs');
    const path = '$SERVER_JSON';
    const j = JSON.parse(fs.readFileSync(path, 'utf-8'));
    j.version = '$VERSION';
    if (j.packages && j.packages[0]) j.packages[0].version = '$VERSION';
    fs.writeFileSync(path, JSON.stringify(j, null, 2) + '\n');
  "
fi

cd "$ROOT_DIR"
LLMS_FILE="$ROOT_DIR/site/public/llms-full.txt"
if [ -f "$LLMS_FILE" ]; then
  sed -i.bak "1s/# Functype v.*/# Functype v$VERSION/" "$LLMS_FILE"
  rm "$LLMS_FILE.bak"
fi

git add mcp-server/package.json "$SERVER_JSON" "$LLMS_FILE"
echo "Synced satellites to v$VERSION"
