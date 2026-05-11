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

# MCP registry manifest (mcp-server/server.json) — versions and name must
# stay aligned with mcp-server/package.json so the registry stays in sync.
SERVER_JSON="$ROOT_DIR/mcp-server/server.json"
if [ -f "$SERVER_JSON" ]; then
  SERVER_VERSION=$(node -p "require('$SERVER_JSON').version")
  SERVER_PKG_VERSION=$(node -p "require('$SERVER_JSON').packages[0].version")
  SERVER_NAME=$(node -p "require('$SERVER_JSON').name")
  MCP_NAME=$(node -p "require('$ROOT_DIR/mcp-server/package.json').mcpName || ''")

  if [ "$ROOT_VERSION" != "$SERVER_VERSION" ]; then
    echo "Error: Version mismatch — functype=$ROOT_VERSION, server.json.version=$SERVER_VERSION"
    echo "Run 'pnpm version:bump $ROOT_VERSION' to sync."
    exit 1
  fi
  if [ "$ROOT_VERSION" != "$SERVER_PKG_VERSION" ]; then
    echo "Error: Version mismatch — functype=$ROOT_VERSION, server.json.packages[0].version=$SERVER_PKG_VERSION"
    echo "Run 'pnpm version:bump $ROOT_VERSION' to sync."
    exit 1
  fi
  if [ -n "$MCP_NAME" ] && [ "$MCP_NAME" != "$SERVER_NAME" ]; then
    echo "Error: mcp-server/package.json mcpName ('$MCP_NAME') does not match server.json name ('$SERVER_NAME')"
    exit 1
  fi
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