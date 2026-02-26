/**
 * Runtime loader for functype CLI data.
 * Uses dynamic import so the data reflects whichever functype version
 * is installed in node_modules at runtime (not baked in at build time).
 */

import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"

export type { InterfaceData, TypeData } from "functype/cli"
import type { InterfaceData, TypeData } from "functype/cli"

const require = createRequire(import.meta.url)

export let TYPES: Record<string, TypeData> = {}
export let INTERFACES: Record<string, InterfaceData> = {}
export let CATEGORIES: Record<string, string[]> = {}
export let FULL_INTERFACES: Record<string, string> = {}
export let VERSION = "unknown"

let initialized = false

export async function initDocsData(force?: boolean): Promise<void> {
  if (initialized && !force) return

  try {
    let cli: typeof import("functype/cli")
    if (force) {
      const resolvedPath = require.resolve("functype/cli")
      cli = await import(`${pathToFileURL(resolvedPath).href}?t=${Date.now()}`)
    } else {
      cli = await import("functype/cli")
    }
    TYPES = cli.TYPES
    INTERFACES = cli.INTERFACES
    CATEGORIES = cli.CATEGORIES
    FULL_INTERFACES = cli.FULL_INTERFACES
    VERSION = cli.VERSION
    initialized = true
  } catch (err) {
    if (force) throw err
    console.error("[functype-mcp] Failed to load functype/cli data — doc tools will return empty results:", err)
  }
}
