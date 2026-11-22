/**
 * A call to a name a companion doesn't have names the companion's type, not its whole structure (roadmap 7a,
 * "types that reject the wrong call"). Each companion is declared under a named interface, such as
 * `OptionCompanion`, so `Option.map(...)` fails with "does not exist on type 'OptionCompanion'" instead of
 * printing every signature. The correct calls below must still compile.
 */
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { typeCheck } from "../docs/snippet-typecheck"

const doc = { path: "test/internal/companion-names", prelude: "export {}\n", autoImport: false }

/** The diagnostics for each snippet, by name. */
const check = (snippets: Readonly<Record<string, string>>): Readonly<Record<string, string>> => {
  const names = Object.keys(snippets)
  const result = typeCheck(
    doc,
    names.map((name) => ({ line: 1, code: snippets[name] ?? "" })),
  )
  expect(result.other).toEqual([])
  return Object.fromEntries(names.map((name, i) => [name, (result.blocks[i] ?? []).join("\n")]))
}

/** Each companion, and a call to a name it doesn't have. */
const wrongCalls: Readonly<Record<string, string>> = {
  Cond: "Cond.when(true)",
  Match: "Match.when(1)",
  DecoderError: 'DecoderError.of("x")',
  Decoder: "Decoder.parse(1)",
  Either: "Either.map(Either.right(1), (n: number) => n)",
  Http: 'Http.fetch("https://example.com")',
  HttpError: 'HttpError.of("x")',
  Identity: "Identity.map(1)",
  Exit: "Exit.map(1)",
  IO: "IO.andThen(IO.succeed(1))",
  Lazy: "Lazy.map(() => 1)",
  LazyList: "LazyList.map([1])",
  List: "List.from([1, 2])",
  Map: "Map.from([[1, 2]])",
  Obj: "Obj.map({ a: 1 })",
  Option: "Option.map(Option(1), (n: number) => n)",
  Ref: "Ref.get(1)",
  Set: "Set.from([1])",
  Stack: "Stack.from([1])",
  Try: "Try.map(() => 1)",
  Tuple: "Tuple.map([1, 2])",
}

/** Correct calls, which must still compile. */
const rightCalls: Readonly<Record<string, string>> = {
  constructors: `import { Either, IO, List, Option, Try, Tuple } from "functype"
const a: Option<number> = Option(1)
const b: Option<number> = Option<number>(null)
const c: List<number> = List([1, 2])
const d: Try<number> = Try(() => 1)
const e: Either<string, number> = Either<string, number>(1, true)
const f = Tuple<[number, string]>([1, "a"])
const g: IO<never, unknown, number> = IO(() => 1)
export const all = [a, b, c, d, e, f.get(0), g]`,
  statics: `import { Either, IO, List, Option, Try } from "functype"
const a: Option<number> = Option.none<number>()
const b: Either<string, number> = Either.right<string, number>(1)
const c: List<number> = List.of(1, 2)
const d: IO<never, never, number> = IO.succeed(1)
const e: Try<number> = Try.success(1)
export const all = [a, b, c, d, e]`,
  instantiationExpressions: `import { Option, Try, Tuple } from "functype"
type TryOfNumber = ReturnType<typeof Try<number>>
const a: TryOfNumber = Try(() => 1)
const ofNumber = Option<number>
const b: Option<number> = ofNumber(1)
type Pair = ReturnType<typeof Tuple<[number, string]>>
const c: Pair = Tuple<[number, string]>([1, "a"])
export const all = [a, b, c]`,
  // A companion passed as a callback keeps its generic: Option<number>[], not Option<unknown>[]
  asCallback: `import { List, Option, Some, Try } from "functype"
const a: Option<number>[] = [1, null, 3].map(Option)
const b: Promise<List<number>> = Promise.resolve([1]).then(List)
const c: Option<number> = Some(1).flatMap(Option)
const d: Try<number>[] = [() => 1].map(Try)
export const all = [a, b, c, d]`,
  // The { _tag } companions keep the implicit index signature of an object type
  tagObjects: `import { Decoder, DecoderError, Http, HttpError } from "functype"
const a: Record<string, unknown> = Http
const b: Record<string, unknown> = HttpError
const c: Record<string, unknown> = Decoder
const d: { readonly [key: string]: unknown } = DecoderError
const entries: [string, unknown][] = Object.entries(Http)
export const all = [a, b, c, d, entries]`,
  typeofCompanion: `import { List, Option } from "functype"
const companion: typeof Option = Option
const ofList: typeof List.of = List.of
export const all = [companion(1), ofList(1)]`,
  // Every companion's type can be imported from the package root
  exported: `import type { ${Object.keys(wrongCalls)
    .map((name) => `${name}Companion`)
    .join(", ")} } from "functype"
import { Option } from "functype"
const named: OptionCompanion = Option
export const all = [named]`,
}

// One program for every snippet: each typeCheck call compiles functype's src again
const results = check({
  ...Object.fromEntries(
    Object.entries(wrongCalls).map(([name, call]) => [`wrong:${name}`, `import { ${name} } from "functype"\n${call}`]),
  ),
  ...Object.fromEntries(Object.entries(rightCalls).map(([name, code]) => [`right:${name}`, code])),
})

describe("companions name their type in errors", () => {
  it.each(Object.keys(wrongCalls))("%s: a call to a missing name names the companion's type", (name) => {
    expect(results[`wrong:${name}`]).toContain(`does not exist on type '${name}Companion'.`)
  })

  it.each(Object.keys(rightCalls))("%s: correct calls still compile", (name) => {
    expect(results[`right:${name}`]).toBe("")
  })
})

/** Every `export const X = Companion(...)` in src, with its type annotation and its statics argument. */
const companionsInSource = (): ReadonlyArray<{ name: string; annotation: string; statics: string; file: string }> => {
  const src = join(import.meta.dirname, "..", "..", "src")
  return readdirSync(src, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) =>
      [
        ...readFileSync(join(src, file), "utf8").matchAll(
          /export const (\w+)(?:: (\w+))? = Companion\(\s*(?:[^,]+|\{[^}]*\}(?: as const)?),\s*(\w+)\s*,?\s*\)/g,
        ),
      ].map((m) => ({ name: m[1] ?? "", annotation: m[2] ?? "", statics: m[3] ?? "", file })),
    )
}

/**
 * How many times src calls `Companion`, however the call is written: wrapped by Prettier, with
 * inline statics, type arguments or an inline annotation. A call the pattern above can't read
 * makes the counts differ, so the guard can't skip it silently.
 */
const companionCallsInSource = (): number => {
  const src = join(import.meta.dirname, "..", "..", "src")
  return readdirSync(src, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) => [...readFileSync(join(src, file), "utf8").matchAll(/(?<!function )\bCompanion(?:<[^(]*>)?\(/g)])
    .length
}

describe("every companion in src follows the pattern", () => {
  const found = companionsInSource()

  it("finds the companions", () => {
    expect(found.length).toBeGreaterThanOrEqual(Object.keys(wrongCalls).length)
  })

  // A new companion written in a shape the pattern can't read fails here: give it the usual
  // `export const X: XCompanion = Companion(XConstructor, XStatics)` form.
  it("reads every Companion call in src", () => {
    expect(found.length).toBe(companionCallsInSource())
  })

  it.each(found)("$name ($file) is typed by its named companion interface", ({ name, annotation }) => {
    expect(annotation).toBe(`${name}Companion`)
  })

  // Passing a value named like the interface makes the bundled .d.ts declare and export a value
  // `XCompanion` that doesn't exist at run time. The statics go through a second name, `XStatics`.
  it.each(found)("$name passes its statics under a name other than its interface's", ({ name, statics }) => {
    expect(statics).not.toBe(`${name}Companion`)
  })

  it("lists every companion in this spec's wrong-call checks, so a new one gets the message test", () => {
    expect(found.map(({ name }) => name).filter((name) => !(name in wrongCalls))).toEqual([])
  })
})
