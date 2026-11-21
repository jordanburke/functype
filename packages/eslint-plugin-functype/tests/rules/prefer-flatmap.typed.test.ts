import { describe } from "vitest"

import rule from "../../src/rules/prefer-flatmap"
import { typedFilename, typedRuleTester } from "../utils/typed-rule-tester"

/**
 * With type information, `prefer-flatmap` skips a `.map` whose receiver is a functype container that
 * isn't a collection (#520): Option, Either, Try, Lazy, Exit, IO. Their `flatMap` expects the same
 * container back, not an array, so `.flatMap` wouldn't compile. Collections and native arrays still
 * report, because their `flatMap` takes an iterable.
 */
const prelude = `
  import { Either, type Exit, IO, Lazy, List, Option, Set, Try } from "functype"
  declare const capped: ReadonlyArray<{ file: string }>
  declare const lookup: ReadonlyArray<{ id: number }>
`

const ok = (name: string, code: string) => ({ name, filename: typedFilename, code: prelude + code })

const nested = (name: string, code: string) => ({
  name,
  filename: typedFilename,
  code: prelude + code,
  errors: [{ messageId: "preferFlatMapNested" as const }],
})

const chain = (name: string, code: string) => ({
  name,
  filename: typedFilename,
  code: prelude + code,
  errors: [{ messageId: "preferFlatMapChain" as const }],
})

describe("prefer-flatmap (type-aware)", () => {
  typedRuleTester.run("prefer-flatmap", rule, {
    valid: [
      ok(
        "The issue's repro: an Option-typed variable whose map returns an array from an outer variable",
        `declare const tracked: Option<ReadonlySet<string>>
         declare const changed: Option<ReadonlySet<string>>
         export const findings = tracked
           .flatMap((t) => changed.map((c) => capped.filter((f) => t.has(f.file) && !c.has(f.file))))
           .getOrElse(() => [])`,
      ),
      ok(
        "An Option inferred from a function's return, with no annotation",
        `declare function load(): Option<number>
         const loaded = load()
         export const rows = loaded.map((n) => lookup.filter((r) => r.id === n))`,
      ),
      ok(
        "An Either-typed identifier",
        `declare const parsed: Either<string, number>
         export const rows = parsed.map((n) => lookup.filter((r) => r.id === n))`,
      ),
      ok(
        "A Try-typed identifier",
        `declare const attempt: Try<number>
         export const rows = attempt.map((n) => lookup.filter((r) => r.id === n))`,
      ),
      ok(
        "A Lazy-typed identifier",
        `declare const later: Lazy<number>
         export const rows = later.map((n) => lookup.filter((r) => r.id === n))`,
      ),
      ok(
        "An IO-typed identifier",
        `declare const effect: IO<never, Error, number>
         export const rows = effect.map((n) => lookup.filter((r) => r.id === n))`,
      ),
      ok(
        "An Exit-typed identifier",
        `declare const done: Exit<Error, number>
         export const rows = done.map((n) => lookup.filter((r) => r.id === n))`,
      ),
      ok(
        "An Option in a chain whose first map returns an array",
        `declare const changed: Option<ReadonlySet<string>>
         export const count = changed.map((c) => capped.filter((f) => !c.has(f.file))).map((xs) => xs.length)`,
      ),
      ok(
        "A literal Option(...) receiver in a chain",
        `declare const maybe: number | undefined
         export const count = Option(maybe).map((n) => lookup.filter((r) => r.id === n)).map((xs) => xs.length)`,
      ),
    ],
    invalid: [
      nested(
        "A native array receiver still reports",
        `declare const ids: number[]
         export const rows = ids.map((id) => lookup.filter((r) => r.id === id))`,
      ),
      nested(
        "A readonly array receiver still reports",
        `declare const ids: ReadonlyArray<number>
         export const rows = ids.map((id) => lookup.filter((r) => r.id === id))`,
      ),
      nested(
        "A tuple receiver still reports",
        `declare const ids: [number, number]
         export const rows = ids.map((id) => lookup.filter((r) => r.id === id))`,
      ),
      nested(
        "A functype List still reports: List.flatMap takes an iterable",
        `declare const ids: List<number>
         export const rows = ids.map((id) => lookup.filter((r) => r.id === id))`,
      ),
      nested(
        "A functype Set still reports: Set.flatMap takes an iterable",
        `declare const ids: Set<number>
         export const rows = ids.map((id) => lookup.filter((r) => r.id === id))`,
      ),
      nested(
        "An any receiver still reports, as without type information",
        `declare const ids: any
         export const rows = ids.map((id: number) => lookup.filter((r) => r.id === id))`,
      ),
      chain(
        "An array in a chain still reports",
        `declare const ids: number[]
         export const count = ids.map((id) => lookup.filter((r) => r.id === id)).map((xs) => xs.length)`,
      ),
    ],
  })
})
