#!/usr/bin/env tsx
/**
 * Generates src/cli/interfaces.generated.ts from each type's `extends` chain
 * in source. Keeps the CLI/MCP trait list aligned with the actual library.
 *
 * Run:  pnpm generate:interfaces
 *
 * data-sync.spec.ts runs the same parser and asserts data.ts is a superset
 * of the generated floor — that's the safety net if someone forgets to
 * regenerate after extending an interface.
 */

import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"

import { TYPE_SOURCES, computeAllInterfaces } from "./parse-interfaces"

const here = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(here, "..")
const outputPath = path.join(packageRoot, "src/cli/interfaces.generated.ts")

const computed = computeAllInterfaces(packageRoot)

const entries = Object.keys(TYPE_SOURCES)
  .map((name) => {
    const list = computed[name] ?? []
    const items = list.map((n) => JSON.stringify(n)).join(", ")
    return `  ${name}: [${items}],`
  })
  .join("\n")

// Emit as a const literal (no Record<string, ...> annotation) so callers can
// look up by literal key without `noUncheckedIndexedAccess` widening the
// result to `... | undefined`.
const body = `/**
 * Auto-generated interface lists derived from each type's \`extends\` chain.
 *
 * DO NOT EDIT MANUALLY. Run \`pnpm generate:interfaces\` to regenerate.
 *
 * Each entry is the source-of-truth floor for the corresponding TYPES entry
 * in src/cli/data.ts — data.ts may add entries for methods declared inline
 * (e.g. List.map is inline rather than via \`extends Functor\`) but cannot
 * drop any of these. The data-sync spec enforces that contract.
 */

export const GENERATED_INTERFACES = {
${entries}
} as const

export type GeneratedTypeName = keyof typeof GENERATED_INTERFACES
`

fs.writeFileSync(outputPath, body, "utf-8")
console.log(`Generated: ${outputPath}`)
for (const [name, list] of Object.entries(computed)) {
  console.log(`  ${name.padEnd(12)} ${list.length} interfaces`)
}
