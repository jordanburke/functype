#!/bin/bash

# Run the full functype validation workflow
# This script should be run before committing any changes

set -e

PROJECT_ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
cd "$PROJECT_ROOT"

echo "======================================"
echo " Functype Validation Workflow"
echo "======================================"
echo ""

# Step 1: Format
echo "📝 Step 1/4: Formatting code with Prettier..."
pnpm format || {
    echo "❌ Formatting failed!"
    echo "Run 'pnpm format' to fix formatting issues"
    exit 1
}
echo "✅ Formatting complete"
echo ""

# Step 2: Lint
echo "🔍 Step 2/4: Linting code with ESLint..."
pnpm lint || {
    echo "❌ Linting failed!"
    echo "Run 'pnpm lint' to fix linting issues"
    exit 1
}
echo "✅ Linting complete"
echo ""

# Step 3: Test
echo "🧪 Step 3/4: Running tests with Vitest..."
pnpm test || {
    echo "❌ Tests failed!"
    echo "Fix failing tests and try again"
    exit 1
}
echo "✅ Tests complete"
echo ""

# Step 4: Build
echo "🔨 Step 4/4: Building project..."
pnpm build || {
    echo "❌ Build failed!"
    echo "Fix build errors and try again"
    exit 1
}
echo "✅ Build complete"
echo ""

echo "======================================"
echo " ✅ All validation checks passed!"
echo "======================================"
echo ""
echo "Your code is ready to commit."
EOF