#!/usr/bin/env node

// Simple wrapper to run typedoc in CI environments
import { execSync } from "child_process"
import { copyFileSync, existsSync, mkdirSync } from "fs"
import { join } from "path"

// List of markdown files that should be preserved during documentation generation
const PRESERVE_FILES = [
  "BUNDLE_OPTIMIZATION.md",
  "HKT.md",
  "ROADMAP.md",
  "TUPLE-EXAMPLES.md",
  "ai-guide.md",
  "examples.md",
  "quick-reference.md",
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

try {
  // Backup documentation files before running TypeDoc
  backupDocsFiles()

  // Disable npm browser opening in CI environments
  try {
    execSync("npm config set browser false", { stdio: "inherit" })
  } catch (error) {
    console.warn("⚠️  Could not set npm browser config:", error)
  }

  // Run TypeDoc
  console.log("Building documentation with TypeDoc...")
  execSync("npx typedoc", { stdio: "inherit" })

  // Restore documentation files after TypeDoc runs
  restoreDocsFiles()

  console.log("Documentation generated successfully in ./typedocs directory")
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
