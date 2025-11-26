#!/usr/bin/env node
/**
 * functype CLI - API documentation for LLMs
 *
 * Usage:
 *   npx functype              # Overview of all types
 *   npx functype <Type>       # Detailed type documentation
 *   npx functype interfaces   # Interface reference
 *   npx functype --json       # JSON output (works with any command)
 *   npx functype --full       # Full TypeScript interfaces with JSDoc
 */

import {
  formatInterfaces,
  formatJson,
  formatOverview,
  formatType,
  getAllTypeNames,
  getInterfacesData,
  getOverviewData,
  getType,
} from "./formatters"
import { FULL_INTERFACES } from "./full-interfaces"

function main(): void {
  const args = process.argv.slice(2)
  const jsonFlag = args.includes("--json")
  const fullFlag = args.includes("--full")
  const helpFlag = args.includes("--help") || args.includes("-h")
  const filteredArgs = args.filter((a) => a !== "--json" && a !== "--full" && a !== "--help" && a !== "-h")

  if (helpFlag) {
    printHelp()
    return
  }

  if (filteredArgs.length === 0) {
    // Default: show overview or full interfaces
    if (fullFlag) {
      const output = jsonFlag ? formatJson(FULL_INTERFACES) : formatAllFullInterfaces()
      console.log(output)
    } else {
      const output = jsonFlag ? formatJson(getOverviewData()) : formatOverview()
      console.log(output)
    }
    return
  }

  const command = filteredArgs[0]

  if (command === "interfaces") {
    // Interface reference
    const output = jsonFlag ? formatJson(getInterfacesData()) : formatInterfaces()
    console.log(output)
    return
  }

  // Type lookup
  const result = getType(command)

  if (!result) {
    console.error(`Unknown type: ${command}`)
    console.error("")
    console.error(`Available types: ${getAllTypeNames().join(", ")}`)
    console.error("")
    console.error("Use: npx functype interfaces - for interface reference")
    process.exit(1)
  }

  // Output type info, with optional full interface
  if (fullFlag) {
    const fullInterface = getFullInterface(result.name)
    if (fullInterface) {
      const output = jsonFlag ? formatJson({ [result.name]: { ...result.data, fullInterface } }) : fullInterface
      console.log(output)
    } else {
      // Fall back to regular output if no full interface available
      const output = jsonFlag ? formatJson({ [result.name]: result.data }) : formatType(result.name, result.data)
      console.log(output)
    }
  } else {
    const output = jsonFlag ? formatJson({ [result.name]: result.data }) : formatType(result.name, result.data)
    console.log(output)
  }
}

/**
 * Get full interface definition for a type (case-insensitive)
 */
function getFullInterface(typeName: string): string | undefined {
  // Try exact match first
  if (FULL_INTERFACES[typeName]) {
    return FULL_INTERFACES[typeName]
  }

  // Try case-insensitive match
  const normalizedInput = typeName.toLowerCase()
  for (const [name, def] of Object.entries(FULL_INTERFACES)) {
    if (name.toLowerCase() === normalizedInput) {
      return def
    }
  }

  return undefined
}

/**
 * Format all full interfaces for output
 */
function formatAllFullInterfaces(): string {
  const lines: string[] = []
  lines.push("FULL INTERFACE DEFINITIONS")
  lines.push("=".repeat(60))
  lines.push("")

  for (const [name, def] of Object.entries(FULL_INTERFACES)) {
    lines.push(`// ${name}`)
    lines.push(def)
    lines.push("")
    lines.push("-".repeat(60))
    lines.push("")
  }

  return lines.join("\n").trimEnd()
}

function printHelp(): void {
  console.log(`functype - API documentation for LLMs

USAGE
  npx functype              Show overview of all types
  npx functype <Type>       Show detailed type documentation
  npx functype interfaces   Show interface reference

OPTIONS
  --full                    Show full TypeScript interface with JSDoc
  --json                    Output as JSON instead of markdown
  --help, -h                Show this help message

EXAMPLES
  npx functype              # Overview of all data structures
  npx functype Option       # Detailed Option documentation
  npx functype either       # Case-insensitive lookup
  npx functype interfaces   # All interface definitions
  npx functype --json       # Overview as JSON
  npx functype Option --json # Option as JSON
  npx functype Option --full # Full TypeScript interface
  npx functype --full       # All full interfaces (large output!)
`)
}

main()
