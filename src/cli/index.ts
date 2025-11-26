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

import { Match } from "../conditional"
import { List } from "../list"
import { Option } from "../option"
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

/** CLI flags parsed from arguments */
interface Flags {
  json: boolean
  full: boolean
  help: boolean
}

/** Parse CLI arguments into flags and filtered args */
const parseArgs = (
  argv: string[],
): {
  flags: Flags
  args: List<string>
} => {
  const rawArgs = List(argv.slice(2))
  return {
    flags: {
      json: rawArgs.includes("--json"),
      full: rawArgs.includes("--full"),
      help: rawArgs.exists((a) => a === "--help" || a === "-h"),
    },
    args: rawArgs.filter((a) => !a.startsWith("--") && a !== "-h"),
  }
}

/** Get full interface definition for a type (case-insensitive) */
const getFullInterface = (typeName: string): Option<string> =>
  Option(FULL_INTERFACES[typeName]).or(
    List(Object.entries(FULL_INTERFACES))
      .find(([name]) => name.toLowerCase() === typeName.toLowerCase())
      .map(([, def]) => def),
  )

/** Format all full interfaces for output */
const formatAllFullInterfaces = (): string => {
  const header = List<string>(["FULL INTERFACE DEFINITIONS", "=".repeat(60), ""])

  const lines = List(Object.entries(FULL_INTERFACES)).foldLeft(header)((acc, [name, def]) =>
    acc.concat(List([`// ${name}`, def, "", "-".repeat(60), ""])),
  )

  return lines.toArray().join("\n").trimEnd()
}

/** Print help message */
const printHelp = (): void => {
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

/** Handle unknown type error */
const handleUnknownType = (command: string): void => {
  console.error(`Unknown type: ${command}`)
  console.error("")
  console.error(`Available types: ${getAllTypeNames().join(", ")}`)
  console.error("")
  console.error("Use: npx functype interfaces - for interface reference")
  process.exit(1)
}

/** Output a result to console */
const output = (content: string): void => console.log(content)

/** Handle type lookup command */
const handleTypeLookup = (command: string, flags: Flags): void =>
  Option(getType(command)).fold(
    () => handleUnknownType(command),
    (result) =>
      Match(flags.full)
        .when(true, () =>
          getFullInterface(result.name).fold(
            () =>
              output(flags.json ? formatJson({ [result.name]: result.data }) : formatType(result.name, result.data)),
            (fullInterface) =>
              output(flags.json ? formatJson({ [result.name]: { ...result.data, fullInterface } }) : fullInterface),
          ),
        )
        .default(() =>
          output(flags.json ? formatJson({ [result.name]: result.data }) : formatType(result.name, result.data)),
        ),
  )

/** Main CLI entry point */
const main = (): void => {
  const { flags, args } = parseArgs(process.argv)

  Match(true)
    .when(flags.help, () => printHelp())
    .when(args.isEmpty(), () =>
      Match(flags.full)
        .when(true, () => output(flags.json ? formatJson(FULL_INTERFACES) : formatAllFullInterfaces()))
        .default(() => output(flags.json ? formatJson(getOverviewData()) : formatOverview())),
    )
    .when(args.head().contains("interfaces"), () =>
      output(flags.json ? formatJson(getInterfacesData()) : formatInterfaces()),
    )
    .default(() =>
      args.head().fold(
        () => output(flags.json ? formatJson(getOverviewData()) : formatOverview()),
        (command) => handleTypeLookup(command, flags),
      ),
    )
}

main()
