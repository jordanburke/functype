#!/usr/bin/env node

// Simple wrapper to run typedoc in CI environments
import { execSync } from "child_process"
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"
import { join } from "path"

// List of markdown files that should be preserved during documentation generation
const PRESERVE_FILES = [
  "BUNDLE_OPTIMIZATION.md",
  "FPromise-Assessment.md",
  "HKT.md",
  "ROADMAP.md",
  "TASK-TODO.md",
  "TUPLE-EXAMPLES.md",
  "TaskMigration.md",
  "ai-guide.md",
  "examples.md",
  "quick-reference.md",
  "task-error-handling.md",
  "tasks.md",
  "type-index.md",
]

// Function to backup important documentation files
function backupDocsFiles() {
  const docsDir = join(process.cwd(), "docs")
  const backupDir = join(process.cwd(), "readme")

  // Create backup directory if it doesn't exist
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }

  // Backup important doc files
  if (existsSync(docsDir)) {
    console.log("Backing up documentation files...")
    PRESERVE_FILES.forEach((file) => {
      const srcPath = join(docsDir, file)
      const destPath = join(backupDir, file)
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath)
        console.log(`- Backed up ${file}`)
      }
    })
  }
}

// Function to restore important documentation files
function restoreDocsFiles() {
  const docsDir = join(process.cwd(), "docs")
  const backupDir = join(process.cwd(), "readme")

  // Create docs directory if it doesn't exist
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true })
  }

  // Restore important doc files
  if (existsSync(backupDir)) {
    console.log("Restoring documentation files...")
    PRESERVE_FILES.forEach((file) => {
      const srcPath = join(backupDir, file)
      const destPath = join(docsDir, file)
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath)
        console.log(`- Restored ${file}`)
      }
    })
  }
}

// Ensure required documentation files exist
function ensureDocsFiles() {
  const docsDir = join(process.cwd(), "docs")

  // Create docs directory if it doesn't exist
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true })
  }

  // Check for BUNDLE_OPTIMIZATION.md and create it if missing
  const bundleOptPath = join(docsDir, "BUNDLE_OPTIMIZATION.md")
  if (!existsSync(bundleOptPath)) {
    console.log("Creating missing BUNDLE_OPTIMIZATION.md file...")
    const bundleOptContent = `# Bundle Size Optimization Guide

## Overview

Functype is designed with tree-shaking in mind, allowing you to optimize your application's bundle size by only including the specific modules you need.

## Import Strategies

### Strategy 1: Selective Module Imports (Recommended)

Import only the specific modules you need to reduce bundle size significantly.

\`\`\`typescript
import { Option } from "functype/option"
import { Either } from "functype/either"

// Usage
const option = Option.some(42)
const either = Either.right("value")
\`\`\`

### Strategy 2: Direct Constructor Imports (Smallest Bundle)

For the most aggressive tree-shaking, import only the specific constructors and functions you need.

\`\`\`typescript
import { some, none } from "functype/option"
import { right } from "functype/either"

// Usage
const option = some(42)
const none_value = none()
const either = right("value")
\`\`\`

## Bundle Size Comparison

| Import Strategy | Approximate Bundle Size  | Best For                   |
| --------------- | ------------------------ | -------------------------- |
| Selective       | 200-500 bytes per module | Most applications          |
| Direct          | <200 bytes per feature   | Size-critical applications |

## Common Module Sizes

| Module   | Approximate Size (minified) | Gzipped Size |
| -------- | --------------------------- | ------------ |
| Option   | ~200 bytes                  | ~140 bytes   |
| Either   | ~290 bytes                  | ~190 bytes   |
| List     | ~170 bytes                  | ~125 bytes   |
| Try      | ~170 bytes                  | ~125 bytes   |
| Tuple    | ~120 bytes                  | ~100 bytes   |
| FPromise | ~200 bytes                  | ~140 bytes   |

## Additional Tips

1. **Import Analysis**: Use tools like [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer) or [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer) to analyze your bundle and identify opportunities for optimization.

2. **Dynamic Imports**: Consider using dynamic imports for rarely used functionality:

   \`\`\`typescript
   // Only load when needed
   const useRareFeature = async () => {
     const { someLargeUtility } = await import("functype/some-large-module")
     return someLargeUtility()
   }
   \`\`\`

3. **Development vs Production**: During development, you might prefer the convenience of importing everything. In production builds, switch to selective imports.

4. **Peer Dependencies**: Functype has minimal dependencies, and the only external dependency (\`safe-stable-stringify\`) is quite small.

## Need Help?

If you need assistance with optimizing your bundle size further, please open an issue on our GitHub repository.
`
    writeFileSync(bundleOptPath, bundleOptContent)
  }
}

try {
  // First, ensure required documentation files exist
  ensureDocsFiles()

  // Backup documentation files before running TypeDoc
  backupDocsFiles()

  // Run TypeDoc
  console.log("Building documentation with TypeDoc...")
  execSync("npx typedoc", { stdio: "inherit" })

  // Restore documentation files after TypeDoc runs
  restoreDocsFiles()

  console.log("Documentation generated successfully in ./docs directory")
} catch (error) {
  console.error("Error building documentation:", error)

  // Try to restore docs even if there was an error
  try {
    restoreDocsFiles()
  } catch (restoreError) {
    console.error("Error restoring documentation files:", restoreError)
  }

  process.exit(1)
}
