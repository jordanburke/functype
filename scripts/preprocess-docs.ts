#!/usr/bin/env tsx

/**
 * Documentation Preprocessing Script
 *
 * This script processes markdown files to replace @includeCode tags with actual code
 * from test files, making them compatible with TypeDoc.
 */

import { readFileSync, writeFileSync } from "fs"
import { dirname, resolve } from "path"
import { fileURLToPath } from "url"

interface CodeRegion {
  content: string
  startLine: number
  endLine: number
}

class DocumentationPreprocessor {
  private readonly projectRoot: string

  constructor() {
    const __filename = fileURLToPath(import.meta.url)
    this.projectRoot = resolve(dirname(__filename), "..")
  }

  /**
   * Extract a code region from a file
   */
  private extractCodeRegion(filePath: string, regionName: string): CodeRegion | null {
    try {
      const fullPath = resolve(this.projectRoot, filePath)
      const content = readFileSync(fullPath, "utf-8")
      const lines = content.split("\n")

      const startPattern = new RegExp(`^\\s*//\\s*#region\\s+${regionName}\\s*$`)
      const endPattern = new RegExp(`^\\s*//\\s*#endregion\\s+${regionName}\\s*$`)

      let startLine = -1
      let endLine = -1

      // Find region boundaries
      for (let i = 0; i < lines.length; i++) {
        if (startPattern.test(lines[i])) {
          startLine = i
        } else if (endPattern.test(lines[i]) && startLine !== -1) {
          endLine = i
          break
        }
      }

      if (startLine === -1 || endLine === -1) {
        console.warn(`⚠️  Region '${regionName}' not found in ${filePath}`)
        return null
      }

      // Extract content between regions (excluding region markers)
      const codeLines = lines.slice(startLine + 1, endLine)

      // Remove common indentation
      const minIndent = this.getMinIndentation(codeLines)
      const cleanedLines = codeLines.map((line) => (line.length > minIndent ? line.substring(minIndent) : line))

      return {
        content: cleanedLines.join("\n"),
        startLine: startLine + 1,
        endLine: endLine - 1,
      }
    } catch (error) {
      console.error(`❌ Error reading file ${filePath}:`, error)
      return null
    }
  }

  /**
   * Calculate minimum indentation (excluding empty lines)
   */
  private getMinIndentation(lines: string[]): number {
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0)
    if (nonEmptyLines.length === 0) return 0

    return Math.min(
      ...nonEmptyLines.map((line) => {
        const match = line.match(/^( *)/)
        return match ? match[1].length : 0
      }),
    )
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = filePath.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "ts":
        return "typescript"
      case "js":
        return "javascript"
      case "tsx":
        return "tsx"
      case "jsx":
        return "jsx"
      case "json":
        return "json"
      default:
        return "typescript" // Default for functype project
    }
  }

  /**
   * Process a single markdown file
   */
  processFile(inputPath: string, outputPath: string): boolean {
    try {
      console.log(`📝 Processing ${inputPath} -> ${outputPath}`)

      const content = readFileSync(inputPath, "utf-8")
      const includeCodePattern = /\{@includeCode\s+([^\s}]+)#([^\s}]+)\}/g

      let processedContent = content
      let match: RegExpExecArray | null
      let replacements = 0

      while ((match = includeCodePattern.exec(content)) !== null) {
        const [fullMatch, filePath, regionName] = match

        console.log(`  🔍 Found @includeCode: ${filePath}#${regionName}`)

        const codeRegion = this.extractCodeRegion(filePath, regionName)
        if (codeRegion) {
          const language = this.detectLanguage(filePath)
          const codeBlock = `\`\`\`${language}\n${codeRegion.content}\n\`\`\``

          processedContent = processedContent.replace(fullMatch, codeBlock)
          replacements++

          console.log(
            `  ✅ Replaced with ${language} code block (${codeRegion.endLine - codeRegion.startLine + 1} lines)`,
          )
        } else {
          console.warn(`  ⚠️  Could not extract region, leaving @includeCode tag unchanged`)
        }
      }

      writeFileSync(outputPath, processedContent, "utf-8")

      if (replacements > 0) {
        console.log(`✨ Successfully processed ${inputPath} with ${replacements} replacements`)
      } else {
        console.log(`📄 No @includeCode tags found in ${inputPath}`)
      }

      return true
    } catch (error) {
      console.error(`❌ Error processing ${inputPath}:`, error)
      return false
    }
  }

  /**
   * Process multiple files
   */
  processFiles(files: Array<{ input: string; output: string }>): boolean {
    console.log("🚀 Starting documentation preprocessing...")

    let allSuccessful = true
    for (const { input, output } of files) {
      if (!this.processFile(input, output)) {
        allSuccessful = false
      }
    }

    if (allSuccessful) {
      console.log("🎉 All files processed successfully!")
    } else {
      console.error("❌ Some files failed to process")
    }

    return allSuccessful
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const preprocessor = new DocumentationPreprocessor()

  // Configure files to process
  const filesToProcess = [
    {
      input: "README.md",
      output: "README.processed.md",
    },
  ]

  const success = preprocessor.processFiles(filesToProcess)
  process.exit(success ? 0 : 1)
}

export { DocumentationPreprocessor }
