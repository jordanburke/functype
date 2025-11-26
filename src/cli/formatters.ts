/**
 * Output formatters for CLI - markdown and JSON
 * Uses functype FP patterns for implementation
 */

import { List } from "../list"
import { Option } from "../option"
import type { InterfaceData, TypeData } from "./data"
import { CATEGORIES, INTERFACES, TYPES, VERSION } from "./data"

/**
 * Format the library overview (default command)
 */
export const formatOverview = (): string => {
  const header = List<string>([`functype ${VERSION} - Scala-inspired FP for TypeScript`, ""])

  const categoryLines = List(Object.entries(CATEGORIES)).foldLeft(header)((acc, [category, typeNames]) => {
    const withCategory = acc.add(category.toUpperCase())
    const withTypes = List(typeNames).foldLeft(withCategory)((innerAcc, name) =>
      Option(TYPES[name]).fold(
        () => innerAcc,
        (type) => {
          const ifaces = type.interfaces.length > 0 ? ` [${type.interfaces.join(", ")}]` : ""
          return innerAcc.add(`  ${name}${ifaces}`).add(`    ${type.description}`)
        },
      ),
    )
    return withTypes.add("")
  })

  return categoryLines
    .concat(List(["Use: npx functype <Type> for details", "Use: npx functype interfaces for interface reference"]))
    .toArray()
    .join("\n")
}

/**
 * Format detailed type documentation
 */
export const formatType = (name: string, data: TypeData): string => {
  const ifaceList = data.interfaces.length > 0 ? ` [${data.interfaces.join(", ")}]` : ""
  const categoryOrder = List(["create", "transform", "extract", "check", "other"] as const)
  const header = List<string>([`${name}<T>${ifaceList}`, "", data.description, ""])

  const lines = categoryOrder.foldLeft(header)((acc, cat) =>
    Option(data.methods[cat])
      .filter((methods) => methods.length > 0)
      .fold(
        () => acc,
        (methods) => {
          const withCat = acc.add(cat.toUpperCase())
          const withMethods = List(methods).foldLeft(withCat)((innerAcc, method) => innerAcc.add(`  ${method}`))
          return withMethods.add("")
        },
      ),
  )

  return lines.toArray().join("\n").trimEnd()
}

/**
 * Format interface reference
 */
export const formatInterfaces = (): string => {
  const header = List<string>(["INTERFACES", ""])

  const lines = List(Object.entries(INTERFACES)).foldLeft(header)((acc, [name, data]) => {
    const ext = data.extends ? ` extends ${data.extends}` : ""
    const withHeader = acc.add(`${name}<A>${ext}`).add(`  ${data.description}`)
    const withMethods = List(data.methods).foldLeft(withHeader)((innerAcc, method) => innerAcc.add(`  ${method}`))
    return withMethods.add("")
  })

  return lines.toArray().join("\n").trimEnd()
}

/**
 * Format as JSON
 */
export const formatJson = (data: unknown): string => JSON.stringify(data, null, 2)

/**
 * Get overview data for JSON output
 */
export const getOverviewData = (): {
  version: string
  categories: Record<string, string[]>
  types: Record<string, TypeData>
} => ({
  version: VERSION,
  categories: CATEGORIES,
  types: TYPES,
})

/**
 * Get type data by name (case-insensitive)
 */
export const getType = (name: string): { name: string; data: TypeData } | undefined =>
  Option(TYPES[name])
    .map((data) => ({ name, data }))
    .or(
      List(Object.entries(TYPES))
        .find(([typeName]) => typeName.toLowerCase() === name.toLowerCase())
        .map(([typeName, typeData]) => ({ name: typeName, data: typeData })),
    )
    .orUndefined()

/**
 * Get all type names for error messages
 */
export const getAllTypeNames = (): string[] => Object.keys(TYPES)

/**
 * Get interfaces data for JSON output
 */
export const getInterfacesData = (): Record<string, InterfaceData> => INTERFACES
