#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

ROOT_VERSION=$(node -p "require('$ROOT_DIR/package.json').version")
MCP_VERSION=$(node -p "require('$ROOT_DIR/mcp-server/package.json').version")

if [ "$ROOT_VERSION" != "$MCP_VERSION" ]; then
  echo "Error: Version mismatch — functype=$ROOT_VERSION, functype-mcp-server=$MCP_VERSION"
  echo "Run 'pnpm version:bump $ROOT_VERSION' to sync."
  exit 1
fi

LLMS_FILE="$ROOT_DIR/site/public/llms-full.txt"
if [ -f "$LLMS_FILE" ]; then
  LLMS_VERSION=$(head -1 "$LLMS_FILE" | sed 's/# Functype v//')
  if [ "$ROOT_VERSION" != "$LLMS_VERSION" ]; then
    echo "Error: Version mismatch — functype=$ROOT_VERSION, llms-full.txt=$LLMS_VERSION"
    echo "Run 'pnpm version:bump $ROOT_VERSION' to sync."
    exit 1
  fi
fi