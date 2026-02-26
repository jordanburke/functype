/**
 * Markdown formatters for MCP tool output.
 * Plain TypeScript — no functype dependency in formatters.
 */

import type { InterfaceData, TypeData } from "./data"
import { CATEGORIES, FULL_INTERFACES, INTERFACES, TYPES, VERSION } from "./data"

const METHOD_CATEGORIES = ["create", "transform", "extract", "check", "other"] as const

export const formatOverview = (): string => {
  const lines: string[] = [`# functype ${VERSION} — Scala-inspired FP for TypeScript`, ""]

  for (const [category, typeNames] of Object.entries(CATEGORIES)) {
    lines.push(`## ${category}`, "")
    for (const name of typeNames) {
      const type = TYPES[name]
      if (type) {
        const ifaces = type.interfaces.length > 0 ? ` [${type.interfaces.join(", ")}]` : ""
        lines.push(`**${name}**${ifaces}`)
        lines.push(`  ${type.description}`, "")
      }
    }
  }

  lines.push("---", "Use `get_type_api` for detailed type reference.", "Use `get_interfaces` for interface hierarchy.")
  return lines.join("\n")
}

export const formatType = (name: string, data: TypeData, includeFullInterface?: boolean): string => {
  const ifaceList = data.interfaces.length > 0 ? ` [${data.interfaces.join(", ")}]` : ""
  const lines: string[] = [`# ${name}<T>${ifaceList}`, "", data.description, ""]

  for (const cat of METHOD_CATEGORIES) {
    const methods = data.methods[cat]
    if (methods && methods.length > 0) {
      lines.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)}`, "")
      for (const method of methods) {
        lines.push(`- \`${method}\``)
      }
      lines.push("")
    }
  }

  if (includeFullInterface) {
    const fullInterface = FULL_INTERFACES[name]
    if (fullInterface) {
      lines.push("## Full Interface", "", "```typescript", fullInterface, "```")
    }
  }

  return lines.join("\n").trimEnd()
}

export const formatInterfaces = (): string => {
  const lines: string[] = ["# Interfaces", ""]

  for (const [name, data] of Object.entries(INTERFACES)) {
    const ext = data.extends ? ` extends ${data.extends}` : ""
    lines.push(`## ${name}<A>${ext}`, "", data.description, "")
    for (const method of data.methods) {
      lines.push(`- \`${method}\``)
    }
    lines.push("")
  }

  return lines.join("\n").trimEnd()
}

export const searchTypes = (query: string): string => {
  const q = query.toLowerCase()
  const matches: Array<{ name: string; data: TypeData }> = []

  for (const [name, data] of Object.entries(TYPES)) {
    const nameMatch = name.toLowerCase().includes(q)
    const descMatch = data.description.toLowerCase().includes(q)
    const ifaceMatch = data.interfaces.some((i) => i.toLowerCase().includes(q))
    const methodMatch = Object.values(data.methods)
      .flat()
      .some((m) => m.toLowerCase().includes(q))

    if (nameMatch || descMatch || ifaceMatch || methodMatch) {
      matches.push({ name, data })
    }
  }

  if (matches.length === 0) {
    return `No types found matching "${query}". Available types: ${Object.keys(TYPES).join(", ")}`
  }

  if (matches.length === 1) {
    const match = matches[0]!
    return formatType(match.name, match.data)
  }

  const lines: string[] = [`# Search results for "${query}"`, "", `Found ${matches.length} matching types:`, ""]
  for (const match of matches) {
    const ifaces = match.data.interfaces.length > 0 ? ` [${match.data.interfaces.join(", ")}]` : ""
    lines.push(`**${match.name}**${ifaces}`)
    lines.push(`  ${match.data.description}`, "")
  }

  lines.push("---", "Use `get_type_api` with a specific type name for full details.")
  return lines.join("\n")
}

export const getTypeByName = (name: string): { name: string; data: TypeData } | undefined => {
  const direct = TYPES[name]
  if (direct) return { name, data: direct }

  const entry = Object.entries(TYPES).find(([typeName]) => typeName.toLowerCase() === name.toLowerCase())
  if (entry) return { name: entry[0], data: entry[1] }

  return undefined
}

export const getInterfaceByName = (name: string): { name: string; data: InterfaceData } | undefined => {
  const direct = INTERFACES[name]
  if (direct) return { name, data: direct }

  const entry = Object.entries(INTERFACES).find(([ifaceName]) => ifaceName.toLowerCase() === name.toLowerCase())
  if (entry) return { name: entry[0], data: entry[1] }

  return undefined
}
