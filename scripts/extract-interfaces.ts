#!/usr/bin/env npx tsx
/**
 * Extracts full TypeScript interface definitions with JSDoc comments from source files.
 * Generates src/cli/full-interfaces.ts for the --full flag.
 *
 * Uses functype's own FP patterns for implementation.
 */

import * as fs from "fs"
import * as path from "path"

import { List } from "../src/list"
import { Cond } from "../src/conditional"
import { Option, Some } from "../src/option"
import { Try } from "../src/try"

interface InterfaceInfo {
  name: string
  sourceFile: string
  fullText: string
}

interface TypeSource {
  file: string
  extractName?: string
  isType?: boolean
}

const TYPE_SOURCES: Record<string, TypeSource> = {
  Option: { file: "src/option/Option.ts" },
  Either: { file: "src/either/Either.ts" },
  Try: { file: "src/try/Try.ts" },
  List: { file: "src/list/List.ts" },
  Set: { file: "src/set/Set.ts" },
  Map: { file: "src/map/Map.ts" },
  Lazy: { file: "src/lazy/Lazy.ts" },
  LazyList: { file: "src/list/LazyList.ts" },
  TaskOutcome: { file: "src/core/task/Task.ts" },
  FPromise: { file: "src/fpromise/FPromise.ts", isType: true },
  Tuple: { file: "src/tuple/Tuple.ts" },
  Stack: { file: "src/stack/Stack.ts", isType: true },
}

/** Parsing state for extractDefinition */
interface ParseState {
  inDefinition: boolean
  braceCount: number
  hasSeenOpenBrace: boolean
  jsDocStart: Option<number>
  definitionStart: Option<number>
  result: List<string>
}

const initialParseState: ParseState = {
  inDefinition: false,
  braceCount: 0,
  hasSeenOpenBrace: false,
  jsDocStart: Option.none(),
  definitionStart: Option.none(),
  result: List<string>([]),
}

/** Count occurrences of a character in a string */
const countChar = (str: string, char: string): number => (str.match(new RegExp(char, "g")) || []).length

/** Check if line starts a JSDoc comment */
const isJsDocStart = (trimmed: string): boolean => trimmed.startsWith("/**")

/** Check if line is part of JSDoc */
const isJsDocLine = (trimmed: string): boolean => trimmed.startsWith("*") || trimmed.startsWith("/**") || trimmed === ""

/** Check if line matches definition pattern */
const matchesDefinition = (trimmed: string, keyword: string, name: string): boolean =>
  new RegExp(`^export\\s+${keyword}\\s+${name}[<\\s=]`).test(trimmed)

/** Process a single line during definition extraction */
const processLine = (
  state: ParseState,
  line: string,
  index: number,
  keyword: string,
  name: string,
): ParseState | { done: true; result: List<string>; jsDocStart: Option<number>; definitionStart: Option<number> } => {
  const trimmed = line.trim()

  // Update JSDoc tracking
  const jsDocStart: Option<number> = Cond.of<Option<number>>()
    .when(isJsDocStart(trimmed) && !state.inDefinition, Some(index))
    .elseWhen(
      !state.inDefinition &&
        state.jsDocStart.isSome() &&
        !isJsDocLine(trimmed) &&
        !matchesDefinition(trimmed, keyword, name),
      Option.none<number>(),
    )
    .else(state.jsDocStart)

  // Check for definition start
  const startsDefinition = matchesDefinition(trimmed, keyword, name) && !state.inDefinition
  const definitionStart = startsDefinition ? jsDocStart.or(Some(index)) : state.definitionStart
  const inDefinition = state.inDefinition || startsDefinition

  // If in definition, accumulate result
  const result = inDefinition ? state.result.add(line) : state.result

  // Count braces
  const openBraces = countChar(line, "\\{")
  const closeBraces = countChar(line, "\\}")
  const braceCount = inDefinition ? state.braceCount + openBraces - closeBraces : state.braceCount
  const hasSeenOpenBrace = state.hasSeenOpenBrace || (inDefinition && openBraces > 0)

  // Check if definition is complete
  if (hasSeenOpenBrace && braceCount === 0 && inDefinition) {
    return { done: true, result, jsDocStart, definitionStart }
  }

  return {
    inDefinition,
    braceCount,
    hasSeenOpenBrace,
    jsDocStart,
    definitionStart,
    result,
  }
}

/**
 * Extracts an interface or type definition with its JSDoc from source text.
 */
const extractDefinition = (sourceText: string, name: string, isType: boolean = false): Option<string> => {
  const keyword = isType ? "type" : "interface"
  const lines = List(sourceText.split("\n"))

  // Process lines with reduce, using early termination via state
  const finalState = lines
    .toArray()
    .reduce(
      (
        acc:
          | ParseState
          | { done: true; result: List<string>; jsDocStart: Option<number>; definitionStart: Option<number> },
        line,
        index,
      ) => {
        if ("done" in acc) return acc
        return processLine(acc, line, index, keyword, name)
      },
      initialParseState,
    )

  if (!("done" in finalState)) {
    return Option.none()
  }

  const { result, jsDocStart, definitionStart } = finalState

  // Include JSDoc if found before definition
  return jsDocStart
    .flatMap((jsDocIdx) =>
      definitionStart.map((defIdx) => {
        if (jsDocIdx < defIdx) {
          const jsDocLines = List(lines.toArray().slice(jsDocIdx, defIdx))
          return jsDocLines.concat(result).toArray().join("\n")
        }
        return result.toArray().join("\n")
      }),
    )
    .or(Some(result.toArray().join("\n")))
}

/**
 * Read file and extract interface/type
 */
const processFile = (typeName: string, source: TypeSource): Option<InterfaceInfo> => {
  const fullPath = path.join(process.cwd(), source.file)

  return Try(() => fs.readFileSync(fullPath, "utf-8")).fold(
    () => {
      console.warn(`Warning: Source file not found or unreadable: ${source.file}`)
      return Option.none<InterfaceInfo>()
    },
    (sourceText) => {
      const extractName = source.extractName ?? typeName
      return extractDefinition(sourceText, extractName, source.isType ?? false).map((fullText) => ({
        name: typeName,
        sourceFile: source.file,
        fullText,
      }))
    },
  )
}

/**
 * Generate the full-interfaces.ts file content
 */
const generateOutput = (interfaces: List<InterfaceInfo>): string => {
  const entries = interfaces
    .map((iface) => {
      const escaped = iface.fullText.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")
      return `  ${iface.name}: \`${escaped}\``
    })
    .toArray()
    .join(",\n\n")

  return `/**
 * Auto-generated full interface definitions.
 * Generated by scripts/extract-interfaces.ts
 * DO NOT EDIT MANUALLY
 */

export const FULL_INTERFACES: Record<string, string> = {
${entries}
}
`
}

/** Log extraction result */
const logResult = (typeName: string, success: boolean): void =>
  console.log(success ? `  ✓ ${typeName}` : `  ✗ ${typeName} (skipped)`)

/** Main execution */
const main = (): void => {
  console.log("Extracting interfaces from source files...")

  const interfaces = List(Object.entries(TYPE_SOURCES)).foldLeft(List<InterfaceInfo>([]))((acc, [typeName, source]) => {
    const maybeInfo = processFile(typeName, source)
    logResult(typeName, maybeInfo.isSome())
    return maybeInfo.fold(
      () => acc,
      (info) => acc.add(info),
    )
  })

  const outputContent = generateOutput(interfaces)
  const outputPath = path.join(process.cwd(), "src/cli/full-interfaces.ts")

  Try(() => fs.writeFileSync(outputPath, outputContent, "utf-8")).fold(
    (error) => {
      console.error(`Failed to write output: ${error}`)
      process.exit(1)
    },
    () => {
      console.log(`\nGenerated: ${outputPath}`)
      console.log(`Extracted ${interfaces.length} interfaces`)
    },
  )
}

main()
