/**
 * Common wrong calls on IO fail with a message that says what to do (roadmap 7a, "types that reject
 * the wrong call"). Each case compiles a snippet as a consumer would and checks the diagnostic's
 * text, because `@ts-expect-error` only proves that something failed. The correct call next to
 * each one must still compile.
 */
import { describe, expect, it } from "vitest"

import { typeCheck } from "../docs/snippet-typecheck"

const doc = { path: "test/io/io-readable-errors", prelude: "export {}\n", autoImport: false }

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

const services = `import { IO, Layer, Tag } from "functype"
type Db = { readonly query: () => string }
const Db = Tag<Db>("Db")
const program = IO.service(Db).map((db) => db.query())
`

const errors = `import { IO } from "functype"
class Plain extends Error {}
class Tagged extends Error {
  readonly _tag = "Tagged" as const
}
`

const results = check({
  // run() before its services are provided
  runUnprovided: `${services}void program.runOrThrow()`,
  runSyncUnprovided: `${services}program.runSync()`,
  runProvided: `${services}void program.provideLayer(Layer.succeed(Db, { query: () => "x" })).runOrThrow()
program.provideService(Db, { query: () => "x" }).runSync()`,
  runGeneric: `import { IO } from "functype"
export const run = <E, A>(io: IO<never, E, A>) => io.runSync()`,

  // catchTag where nothing has a _tag, or nothing can fail
  catchTagUntagged: `${errors}IO.fail(new Plain("x")).catchTag("Plain", () => IO.succeed(0))`,
  catchTagUnfailable: `${errors}IO.succeed(1).catchTag("Tagged", () => IO.succeed(0))`,
  catchTagTagged: `${errors}const io: IO<never, never, number> = IO.fail(new Tagged()).catchTag("Tagged", () => IO.succeed(0))`,

  // IO.gen: a bare yield, and yielding something that isn't an IO
  genBareYield: `import { IO } from "functype"
IO.gen(function* () {
  const x = yield IO.succeed(1)
  return x + 1
})`,
  genYieldOption: `import { IO, Option } from "functype"
IO.gen(function* () {
  yield Option(5)
  return 1
})`,
  genYieldPromise: `import { IO } from "functype"
IO.gen(function* () {
  yield Promise.resolve(1)
  return 1
})`,
  genAnnotatedAny: `import { IO } from "functype"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
IO.gen(function* (): Generator<any, number, any> {
  const a: number = yield* IO.succeed(1)
  return a
})`,
  genYieldStar: `import { IO } from "functype"
const io: IO<never, "e", number> = IO.gen(function* () {
  const a = yield* IO.succeed(1)
  const b = yield* (a > 0 ? IO.succeed(2) : IO.fail("e" as const))
  return a + b
})`,
})

describe("IO's wrong calls say what to do", () => {
  it("run() before the services are provided names them, and the fix", () => {
    expect(results.runUnprovided).toContain("Provide these services first, with provideLayer or provideService")
    expect(results.runUnprovided).toContain("Db")
    expect(results.runSyncUnprovided).toContain("Provide these services first")
    expect(results.runProvided).toBe("")
    expect(results.runGeneric).toBe("")
  })

  it("catchTag where no error has a _tag points to catchAll", () => {
    expect(results.catchTagUntagged).toContain(
      "catchTag needs errors with a _tag field: use catchAll or recoverWith for this error type",
    )
    expect(results.catchTagTagged).toBe("")
  })

  it("catchTag on an IO that can't fail says so", () => {
    expect(results.catchTagUnfailable).toContain(
      "This IO can't fail (its error type is never), so there is nothing to catch",
    )
  })

  it("a bare yield in IO.gen gives unknown, not any", () => {
    expect(results.genBareYield).toContain("'x' is of type 'unknown'")
  })

  it("IO.gen rejects a yield that isn't an IO", () => {
    expect(results.genYieldOption).toContain("IOYieldable")
    expect(results.genYieldPromise).toContain("IOYieldable")
    expect(results.genYieldStar).toBe("")
    expect(results.genAnnotatedAny).toBe("")
  })
})
