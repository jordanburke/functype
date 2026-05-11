#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"

if [ -z "$VERSION" ]; then
  echo "Usage: pnpm version:bump <version>"
  echo "Example: pnpm version:bump 0.50.0"
  exit 1
fi

# Strip leading 'v' if provided
VERSION="${VERSION#v}"

# Validate semver format
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: Invalid semver format: $VERSION"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Bumping version to $VERSION..."

# Update root package.json
cd "$ROOT_DIR"
npm pkg set version="$VERSION"
echo "  Updated functype to $VERSION"

# Update mcp-server package.json
cd "$ROOT_DIR/mcp-server"
npm pkg set version="$VERSION"
echo "  Updated functype-mcp-server to $VERSION"

cd "$ROOT_DIR"

# Update llms-full.txt version header
LLMS_FILE="$ROOT_DIR/site/public/llms-full.txt"
if [ -f "$LLMS_FILE" ]; then
  sed -i.bak "1s/# Functype v.*/# Functype v$VERSION/" "$LLMS_FILE"
  rm "$LLMS_FILE.bak"
  echo "  Updated llms-full.txt to $VERSION"
fi

# Stage and commit
git add package.json mcp-server/package.json site/public/llms-full.txt
git commit -m "v$VERSION"
git tag -a "v$VERSION" -m "v$VERSION"

echo ""
echo "Done! Version $VERSION committed and tagged."
echo "Run 'git push && git push --tags' to publish."