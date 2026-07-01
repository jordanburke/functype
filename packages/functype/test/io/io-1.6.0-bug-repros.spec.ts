/**
 * Type-level repros for functype#221 (iterate exhaustion E channel collapsed
 * to unknown) and functype#222 (tryPromise/async R channel unexpectedly
 * unknown). This spec runs at typecheck time; the runtime bodies just satisfy
 * vitest's expectation that a test exists.
 */
import { describe, expect, it } from "vitest"

import type { IO as IOType } from "@/io"
import { IO, RepeatExhausted } from "@/io"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _ExpectEqual<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

describe("bug repros — do not delete without fixing the underlying bugs", () => {
  it("#222 baseline: IO.tryPromise with catch returning never should give IO<never, never, A>", () => {
    const io = IO.tryPromise({
      try: () => Promise.resolve(1),
      catch: (e) => e as never,
    })
    // Assert R = never, E = never, A = number
    type ActualR = typeof io extends IOType<infer R, infer _E, infer _A> ? R : never
    type ActualE = typeof io extends IOType<infer _R, infer E, infer _A> ? E : never
    type ActualA = typeof io extends IOType<infer _R, infer _E, infer A> ? A : never
    const rIsNever: _ExpectEqual<ActualR, never> = true
    const eIsNever: _ExpectEqual<ActualE, never> = true
    const aIsNumber: _ExpectEqual<ActualA, number> = true
    expect(rIsNever && eIsNever && aIsNumber).toBe(true)
  })

  it("#222: IO.async should give IO<never, unknown, A> — R = never", () => {
    const io = IO.async(() => Promise.resolve(1))
    type ActualR = typeof io extends IOType<infer R, infer _E, infer _A> ? R : never
    const rIsNever: _ExpectEqual<ActualR, never> = true
    expect(rIsNever).toBe(true)
  })

  it("#221: iterate with R=never/E=never step exposes RepeatExhausted<S> in E channel", async () => {
    type S = { i: number; ran: number[] }
    const seed: S = { i: 0, ran: [] }
    const step = (s: S) => IO.sync(() => ({ i: s.i + 1, ran: [...s.ran, s.i] }))
    const done = (s: S) => s.i >= 999

    const io = IO.iterate(seed, step, done, { max: 3 })
    type ActualE = typeof io extends IOType<infer _R, infer E, infer _A> ? E : never
    // With E = never from step, iterate's E = never | RepeatExhausted<S> = RepeatExhausted<S>
    const eIsRepeatExhausted: _ExpectEqual<ActualE, RepeatExhausted<S>> = true

    const res = await io.run()
    // The fold predicate uses lastValue — if this typechecks, #221 is not present at this call site.
    const settled = res.fold(
      (exhausted) => exhausted.lastValue,
      (s) => s,
    )
    expect(eIsRepeatExhausted).toBe(true)
    expect(settled).toBeDefined()
  })

  it("#221 (repeatUntil): repeatUntil E channel surfaces RepeatExhausted<A>", async () => {
    const io = IO.sync(() => 1).repeatUntil((n) => n > 100, { max: 3 })
    type ActualE = typeof io extends IOType<infer _R, infer E, infer _A> ? E : never
    const eIsRepeatExhausted: _ExpectEqual<ActualE, RepeatExhausted<number>> = true

    const res = await io.run()
    res.fold(
      (exhausted) => {
        // Direct field access without cast — this is what #221 says should work
        expect(exhausted._tag).toBe("RepeatExhausted")
        expect(exhausted.lastValue).toBe(1)
      },
      () => {
        throw new Error("unexpected Right")
      },
    )
    expect(eIsRepeatExhausted).toBe(true)
  })

  it("#221 (REAL): iterate with IO.async or IO(...) step — unknown swallows RepeatExhausted<S>", async () => {
    // The reported failure: lift a Promise via IO(...) or IO.async(...) inside
    // the step. Both give E = unknown, and unknown | RepeatExhausted<S>
    // collapses to unknown in TypeScript's union algebra. This is a TS
    // language reality (unknown absorbs); the fix is a runtime guard that
    // lets consumers narrow the collapsed E back to RepeatExhausted.
    type S = { i: number }
    const seed: S = { i: 0 }
    const runOnce = (n: number): Promise<S> => Promise.resolve({ i: n + 1 })
    const step = (s: S) => IO(() => runOnce(s.i)) // IO<never, unknown, S>
    const done = (s: S) => s.i >= 999

    const io = IO.iterate(seed, step, done, { max: 3 })
    type ActualE = typeof io extends IOType<infer _R, infer E, infer _A> ? E : never
    // Confirms TS behavior: E is unknown, not RepeatExhausted<S>.
    const eIsUnknown: _ExpectEqual<ActualE, unknown> = true

    // Recovery path — RepeatExhausted.is narrows the collapsed E channel.
    const res = await io.run()
    const settled = res.fold(
      (e) => {
        if (RepeatExhausted.is<S>(e)) {
          // e is now RepeatExhausted<S> — no cast needed
          return e.lastValue
        }
        throw new Error("step failure — not RepeatExhausted")
      },
      (s) => s,
    )
    expect(settled).toEqual({ i: 3 })
    expect(eIsUnknown).toBe(true)
  })

  it("#222 (REAL): IO.iterate with async step — R inferred as unknown, breaks .run()", async () => {
    // The reported failure — IO<unknown, unknown, ...> where IO<never, ..., ...>
    // is expected. Reproduces by threading the R type through a chain that
    // widens R along the way. If it repros, .run() will type-error.
    type S = { i: number }
    const seed: S = { i: 0 }
    const runOnce = (n: number): Promise<S> => Promise.resolve({ i: n + 1 })
    // Match the reporter's exact expression: tryPromise chained with .map,
    // annotated as IO<never, never, S>.
    const step = (s: S): IOType<never, never, S> =>
      IO.tryPromise({ try: () => runOnce(s.i), catch: (e) => e as never }).map((v) => v)
    const done = (s: S) => s.i >= 999

    const io = IO.iterate(seed, step, done, { max: 3 })
    // If R is never here, .run() works; if unknown, it type-errors.
    const res = await io.run()
    expect(res).toBeDefined()
  })
})
