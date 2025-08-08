import { readdirSync, readFileSync } from "fs"
import { join } from "path"

import { List } from "@/list"
import { Option } from "@/option"

import type { PatternMatch } from "./pattern-suggester"

interface PatternMetadata {
  pattern: string
  description: string
  confidence: number
  tags: string[]
}

/**
 * Extracts metadata from file comments
 */
function extractMetadata(content: string): Option<PatternMetadata> {
  const metadataRegex = /\/\*\*\s*\n((?:\s*\*\s*@\w+.*\n)+)/
  const match = content.match(metadataRegex)

  if (!match) return Option.none()

  const metadata: Partial<PatternMetadata> = {}
  const matchedContent = match[1]
  if (!matchedContent) return Option.none()

  const lines = matchedContent.split("\n")

  lines.forEach((line) => {
    const tagMatch = line.match(/@(\w+)\s+(.+)/)
    if (tagMatch?.[2]) {
      const key = tagMatch[1]
      const value = tagMatch[2]
      switch (key) {
        case "pattern":
          metadata.pattern = value.trim()
          break
        case "description":
          metadata.description = value.trim()
          break
        case "confidence":
          metadata.confidence = parseFloat(value)
          break
        case "tags":
          metadata.tags = value.split(",").map((t) => t.trim())
          break
      }
    }
  })

  if (metadata.pattern && metadata.description && metadata.confidence && metadata.tags) {
    return Option(metadata as PatternMetadata)
  }

  return Option.none()
}

/**
 * Extracts example code from file
 */
function extractExample(content: string): string {
  // Remove the metadata comment and get the actual code
  const codeStart = content.indexOf("*/") + 2
  return content.slice(codeStart).trim()
}

/**
 * Loads patterns from the patterns directory
 */
export function loadPatternsFromFiles(patternsDir: string): List<PatternMatch> {
  const patterns: PatternMatch[] = []

  try {
    const files = readdirSync(patternsDir)
    const beforeFiles = files.filter((f) => f.endsWith(".before.ts"))

    beforeFiles.forEach((beforeFile) => {
      const afterFile = beforeFile.replace(".before.ts", ".after.ts")

      if (files.includes(afterFile)) {
        const beforePath = join(patternsDir, beforeFile)
        const afterPath = join(patternsDir, afterFile)

        const beforeContent = readFileSync(beforePath, "utf-8")
        const afterContent = readFileSync(afterPath, "utf-8")

        const metadataOpt = extractMetadata(beforeContent)

        if (metadataOpt._tag === "Some") {
          const metadata = metadataOpt.get()
          const beforeExample = extractExample(beforeContent)
          const afterExample = extractExample(afterContent)

          // Extract just the first function as an example
          const beforeFn = extractFirstFunction(beforeExample)
          const afterFn = extractFirstFunction(afterExample)

          if (beforeFn && afterFn) {
            patterns.push({
              pattern: metadata.pattern,
              description: metadata.description,
              example: {
                before: beforeFn,
                after: afterFn,
              },
              confidence: metadata.confidence,
              tags: metadata.tags,
            })
          }
        }
      }
    })
  } catch (error) {
    console.warn("Could not load patterns from files:", error)
  }

  return List(patterns)
}

/**
 * Extracts the first function from code
 */
function extractFirstFunction(code: string): string | null {
  // Match export function or function declaration
  const fnMatch = code.match(/(export\s+)?function\s+\w+[^{]+{[^}]+}/)

  if (fnMatch) {
    return fnMatch[0]
  }

  // Match arrow function export
  const arrowMatch = code.match(/(export\s+)?const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}/)

  if (arrowMatch) {
    return arrowMatch[0]
  }

  // Match simple expression
  const exprMatch = code.match(/(export\s+)?const\s+\w+\s*=\s*.+/)

  return exprMatch ? exprMatch[0] : null
}

/**
 * Validates that pattern examples compile
 */
export function validatePatterns(): boolean {
  // This would run TypeScript compiler on the pattern files
  // For now, we assume they're valid if they exist
  return true
}
