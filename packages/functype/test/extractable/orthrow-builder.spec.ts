import { describe, expect, it } from "vitest"

import { Left, Right } from "@/either"
import { None, Some } from "@/option"
import { Try } from "@/try"

/**
 * `orThrow(builder)` (#342): build the thrown error from the failure, so code that must throw for a host
 * (a DBOS step retry, an MCP tool error, a React Query queryFn) doesn't write `throw` inside a `fold`.
 * The ready-made-error form keeps working unchanged.
 */

class StepError extends Error {
  constructor(readonly reason: string) {
    super(`step failed: ${reason}`)
  }
}

describe("Either.orThrow(builder)", () => {
  it("builds the error from the Left value", () => {
    const e = Left<{ readonly message: string }, number>({ message: "no route" })
    expect(() => e.orThrow((l) => new StepError(l.message))).toThrow(new StepError("no route"))
  })

  it("never calls the builder on a Right", () => {
    const calls: unknown[] = []
    const r = Right<string, number>(1)
    expect(
      r.orThrow((l) => {
        calls.push(l)
        return new Error(l)
      }),
    ).toBe(1)
    expect(calls).toEqual([])
  })

  it("still accepts a ready-made error, and throws the Left itself when given nothing", () => {
    expect(() => Left<string, number>("x").orThrow(new Error("given"))).toThrow("given")
    expect(() => Left<string, number>("raw").orThrow()).toThrow("raw")
  })
})

describe("Try.orThrow(builder)", () => {
  it("builds the error from the failure's Error", () => {
    const t = Try<number>(() => {
      throw new Error("disk full")
    })
    expect(() => t.orThrow((e) => new StepError(e.message))).toThrow(new StepError("disk full"))
  })

  it("never calls the builder on a Success", () => {
    const calls: unknown[] = []
    expect(
      Try(() => 2).orThrow((e) => {
        calls.push(e)
        return e
      }),
    ).toBe(2)
    expect(calls).toEqual([])
  })
})

describe("Option.orThrow(builder)", () => {
  it("builds the error lazily on None", () => {
    expect(() => None<number>().orThrow(() => new StepError("not found"))).toThrow(new StepError("not found"))
  })

  it("never calls the builder on a Some", () => {
    const calls: string[] = []
    expect(
      Some(3).orThrow(() => {
        calls.push("built")
        return new Error("unreachable")
      }),
    ).toBe(3)
    expect(calls).toEqual([])
  })
})
