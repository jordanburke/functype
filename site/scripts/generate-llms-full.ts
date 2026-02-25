import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const siteDir = resolve(__dirname, "..")
const rootDir = resolve(siteDir, "..")

const pkg = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf-8"))

const sections: Array<{ label: string; path: string }> = [
  { label: "AI Guide", path: resolve(rootDir, "docs/ai-guide.md") },
  { label: "Quick Reference", path: resolve(rootDir, "docs/quick-reference.md") },
  { label: "Feature Matrix", path: resolve(rootDir, "docs/FUNCTYPE_FEATURE_MATRIX.md") },
  { label: "Option", path: resolve(siteDir, "src/content/option.md") },
  { label: "Either", path: resolve(siteDir, "src/content/either.md") },
  { label: "Try", path: resolve(siteDir, "src/content/try.md") },
  { label: "List", path: resolve(siteDir, "src/content/list.md") },
  { label: "Task", path: resolve(siteDir, "src/content/task.md") },
  { label: "IO", path: resolve(siteDir, "src/content/io.md") },
  { label: "Do-notation", path: resolve(siteDir, "src/content/do-notation.md") },
  { label: "Pattern Matching", path: resolve(siteDir, "src/content/match.md") },
]

const header = `# Functype v${pkg.version}

> A functional programming library for TypeScript with immutable data structures, type-safe error handling, and Scala-inspired patterns.

- Install: npm install functype
- Homepage: ${pkg.homepage}
- Repository: ${pkg.url}

This file contains the complete functype documentation concatenated into a single file for LLM consumption.
`

const separator = (label: string) => `\n${"─".repeat(80)}\n## ${label}\n${"─".repeat(80)}\n`

const parts = [header]

for (const section of sections) {
  const content = readFileSync(section.path, "utf-8")
  parts.push(separator(section.label))
  parts.push(content.trim())
  parts.push("")
}

const output = parts.join("\n")
const outputPath = resolve(siteDir, "public/llms-full.txt")

writeFileSync(outputPath, output, "utf-8")

console.log(`Generated llms-full.txt (${output.length} bytes, ${output.split("\n").length} lines)`)
