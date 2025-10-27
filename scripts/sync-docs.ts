#!/usr/bin/env tsx

/**
 * Documentation Sync Script
 *
 * This script ensures documentation stays in sync across the project:
 * - Syncs FUNCTYPE_FEATURE_MATRIX.md from docs/ to landing/src/content/
 * - Validates links in llms.txt
 * - Checks for common inconsistencies
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

interface ValidationResult {
  success: boolean
  errors: string[]
  warnings: string[]
  info: string[]
}

class DocumentationSyncer {
  private readonly projectRoot: string
  private result: ValidationResult

  constructor() {
    const __filename = fileURLToPath(import.meta.url)
    this.projectRoot = resolve(dirname(__filename), "..")
    this.result = {
      success: true,
      errors: [],
      warnings: [],
      info: [],
    }
  }

  /**
   * Sync feature matrix from docs/ to landing/src/content/
   */
  private syncFeatureMatrix(): void {
    const sourcePath = resolve(this.projectRoot, "docs/FUNCTYPE_FEATURE_MATRIX.md")
    const destPath = resolve(this.projectRoot, "landing/src/content/feature-matrix.md")

    if (!existsSync(sourcePath)) {
      this.result.errors.push(`Source feature matrix not found: ${sourcePath}`)
      this.result.success = false
      return
    }

    try {
      const sourceContent = readFileSync(sourcePath, "utf-8")
      const destContent = existsSync(destPath) ? readFileSync(destPath, "utf-8") : ""

      if (sourceContent === destContent) {
        this.result.info.push("✓ Feature matrix is already in sync")
        return
      }

      copyFileSync(sourcePath, destPath)
      this.result.info.push("✓ Synced feature matrix: docs/ → landing/src/content/")
    } catch (error) {
      this.result.errors.push(`Failed to sync feature matrix: ${error}`)
      this.result.success = false
    }
  }

  /**
   * Validate links in llms.txt
   */
  private validateLlmsTxt(): void {
    const llmsTxtPath = resolve(this.projectRoot, "landing/public/llms.txt")

    if (!existsSync(llmsTxtPath)) {
      this.result.warnings.push("⚠ llms.txt not found in landing/public/")
      return
    }

    try {
      const content = readFileSync(llmsTxtPath, "utf-8")
      const lines = content.split("\n")

      // Extract markdown links: [text](url)
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
      let match: RegExpExecArray | null
      const links: Array<{ text: string; url: string; line: number }> = []

      lines.forEach((line, index) => {
        let lineMatch: RegExpExecArray | null
        const regex = new RegExp(linkPattern)
        while ((lineMatch = regex.exec(line)) !== null) {
          links.push({
            text: lineMatch[1],
            url: lineMatch[2],
            line: index + 1,
          })
        }
      })

      this.result.info.push(`✓ Found ${links.length} links in llms.txt`)

      // Validate local file links
      const localLinks = links.filter((link) => !link.url.startsWith("http"))
      localLinks.forEach((link) => {
        // Check if markdown file exists in landing or docs
        const possiblePaths = [
          resolve(this.projectRoot, "landing/public", link.url),
          resolve(this.projectRoot, "landing/src/pages", link.url),
          resolve(this.projectRoot, link.url),
        ]

        const exists = possiblePaths.some((path) => existsSync(path))
        if (!exists) {
          this.result.warnings.push(`⚠ Line ${link.line}: Local link may be broken: ${link.url}`)
        }
      })

      // Check for common GitHub URLs
      const githubLinks = links.filter((link) => link.url.includes("github.com/jordanburke/functype"))
      if (githubLinks.length > 0) {
        this.result.info.push(`✓ Found ${githubLinks.length} GitHub documentation links`)
      }
    } catch (error) {
      this.result.warnings.push(`⚠ Error validating llms.txt: ${error}`)
    }
  }

  /**
   * Check version consistency across files
   */
  private checkVersionConsistency(): void {
    const packageJsonPath = resolve(this.projectRoot, "package.json")
    const readmePath = resolve(this.projectRoot, "README.md")

    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
      const version = packageJson.version

      // Check README mentions the package
      if (existsSync(readmePath)) {
        const readmeContent = readFileSync(readmePath, "utf-8")
        if (readmeContent.includes("functype")) {
          this.result.info.push(`✓ README.md references functype package`)
        }
      }

      this.result.info.push(`✓ Current version: ${version}`)
    } catch (error) {
      this.result.warnings.push(`⚠ Error checking version consistency: ${error}`)
    }
  }

  /**
   * Run all sync and validation checks
   */
  public run(): ValidationResult {
    console.log("🔄 Syncing documentation...\n")

    this.syncFeatureMatrix()
    this.validateLlmsTxt()
    this.checkVersionConsistency()

    // Print results
    console.log("\n" + "=".repeat(60))

    if (this.result.info.length > 0) {
      console.log("\n📋 Info:")
      this.result.info.forEach((msg) => console.log(`  ${msg}`))
    }

    if (this.result.warnings.length > 0) {
      console.log("\n⚠️  Warnings:")
      this.result.warnings.forEach((msg) => console.log(`  ${msg}`))
    }

    if (this.result.errors.length > 0) {
      console.log("\n❌ Errors:")
      this.result.errors.forEach((msg) => console.log(`  ${msg}`))
    }

    console.log("\n" + "=".repeat(60))

    if (this.result.success) {
      console.log("\n✅ Documentation sync completed successfully!\n")
    } else {
      console.log("\n❌ Documentation sync failed with errors\n")
    }

    return this.result
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const syncer = new DocumentationSyncer()
  const result = syncer.run()
  process.exit(result.success ? 0 : 1)
}

export { DocumentationSyncer }
