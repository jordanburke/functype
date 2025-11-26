/**
 * Output formatters for CLI - markdown and JSON
 */

import type { InterfaceData, TypeData } from "./data"
import { CATEGORIES, INTERFACES, TYPES, VERSION } from "./data"

/**
 * Format the library overview (default command)
 */
export function formatOverview(): string {
  const lines: string[] = []

  lines.push(`functype ${VERSION} - Scala-inspired FP for TypeScript`)
  lines.push("")

  for (const [category, typeNames] of Object.entries(CATEGORIES)) {
    lines.push(category.toUpperCase())
    for (const name of typeNames) {
      const type = TYPES[name]
      if (type) {
        const ifaces = type.interfaces.length > 0 ? ` [${type.interfaces.join(", ")}]` : ""
        lines.push(`  ${name}${ifaces}`)
        lines.push(`    ${type.description}`)
      }
    }
    lines.push("")
  }

  lines.push("Use: npx functype <Type> for details")
  lines.push("Use: npx functype interfaces for interface reference")

  return lines.join("\n")
}

/**
 * Format detailed type documentation
 */
export function formatType(name: string, data: TypeData): string {
  const lines: string[] = []

  // Header
  const ifaceList = data.interfaces.length > 0 ? ` [${data.interfaces.join(", ")}]` : ""
  lines.push(`${name}<T>${ifaceList}`)
  lines.push("")
  lines.push(data.description)
  lines.push("")

  // Methods by category
  const categoryOrder = ["create", "transform", "extract", "check", "other"] as const
  for (const cat of categoryOrder) {
    const methods = data.methods[cat]
    if (methods && methods.length > 0) {
      lines.push(cat.toUpperCase())
      for (const method of methods) {
        lines.push(`  ${method}`)
      }
      lines.push("")
    }
  }

  return lines.join("\n").trimEnd()
}

/**
 * Format interface reference
 */
export function formatInterfaces(): string {
  const lines: string[] = []

  lines.push("INTERFACES")
  lines.push("")

  for (const [name, data] of Object.entries(INTERFACES)) {
    const ext = data.extends ? ` extends ${data.extends}` : ""
    lines.push(`${name}<A>${ext}`)
    lines.push(`  ${data.description}`)
    for (const method of data.methods) {
      lines.push(`  ${method}`)
    }
    lines.push("")
  }

  return lines.join("\n").trimEnd()
}

/**
 * Format as JSON
 */
export function formatJson(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Get overview data for JSON output
 */
export function getOverviewData(): {
  version: string
  categories: Record<string, string[]>
  types: Record<string, TypeData>
} {
  return {
    version: VERSION,
    categories: CATEGORIES,
    types: TYPES,
  }
}

/**
 * Get type data by name (case-insensitive)
 */
export function getType(name: string): { name: string; data: TypeData } | undefined {
  // Try exact match first
  if (TYPES[name]) {
    return { name, data: TYPES[name] }
  }

  // Try case-insensitive match
  const normalizedInput = name.toLowerCase()
  for (const [typeName, typeData] of Object.entries(TYPES)) {
    if (typeName.toLowerCase() === normalizedInput) {
      return { name: typeName, data: typeData }
    }
  }

  return undefined
}

/**
 * Get all type names for error messages
 */
export function getAllTypeNames(): string[] {
  return Object.keys(TYPES)
}

/**
 * Get interfaces data for JSON output
 */
export function getInterfacesData(): Record<string, InterfaceData> {
  return INTERFACES
}
