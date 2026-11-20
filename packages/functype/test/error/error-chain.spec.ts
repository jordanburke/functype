import { describe, expect, test } from "vitest"

import { formatErrorChain, getErrorChain, isTaggedThrowable, Throwable } from "@/index"

// A named step that failed, wrapping the error below it as its cause.
const step = (name: string, message: string, cause?: Error): Error =>
  Throwable.apply(new Error(message, { cause }), undefined, { name, description: `${name} step` })

describe("getErrorChain", () => {
  test("returns an empty array for undefined", () => {
    expect(getErrorChain(undefined)).toEqual([])
  })

  test("returns just the error when it has no cause", () => {
    const error = new Error("alone")
    expect(getErrorChain(error)).toEqual([error])
  })

  test("follows cause from outermost to innermost", () => {
    const level3 = step("Level3", "Level 3 failure")
    const level2 = step("Level2", "Level 2 failure", level3)
    const level1 = step("Level1", "Level 1 failure", level2)

    const chain = getErrorChain(level1)

    expect(chain).toHaveLength(3)
    expect(chain.map((e) => (e as Throwable).taskInfo?.name)).toEqual(["Level1", "Level2", "Level3"])
    expect(chain[2]?.message).toBe("Level 3 failure")
  })

  test("follows a plain Error's native cause", () => {
    const inner = new Error("connection refused")
    const outer = new Error("load user failed", { cause: inner })
    expect(getErrorChain(outer)).toEqual([outer, inner])
  })

  test("keeps custom data on errors in the chain", () => {
    const inner = new Error("Error with custom data")
    Object.defineProperty(inner, "customData", { value: { code: "DATA_ERROR" }, enumerable: true })
    const outer = step("Wrapper", "wrapper failed", inner)

    const chain = getErrorChain(outer)

    expect(chain).toHaveLength(2)
    expect((chain[1] as Error & { customData: { code: string } }).customData.code).toBe("DATA_ERROR")
  })

  test("stops on a circular cause", () => {
    const a = new Error("a")
    const b = new Error("b", { cause: a })
    Object.defineProperty(a, "cause", { value: b })

    expect(getErrorChain(b).length).toBeLessThanOrEqual(102)
  })
})

describe("formatErrorChain", () => {
  const chain = () => step("Outer", "outer failed", step("Inner", "inner failed"))

  test("returns an empty string for undefined", () => {
    expect(formatErrorChain(undefined)).toBe("")
  })

  test("puts one error per line, marking causes with ↳", () => {
    expect(formatErrorChain(chain())).toBe("outer failed\n↳ inner failed")
  })

  test("prefixes step names with includeTasks", () => {
    expect(formatErrorChain(chain(), { includeTasks: true })).toBe("[Outer] outer failed\n↳ [Inner] inner failed")
  })

  test("uses a custom separator", () => {
    expect(formatErrorChain(chain(), { includeTasks: true, separator: " -> " })).toBe(
      "[Outer] outer failed -> ↳ [Inner] inner failed",
    )
  })

  test("appends stack frames with includeStackTrace", () => {
    const error = new Error("with stack")
    error.stack = "Error: with stack\n    at frame1\n    at frame2"
    expect(formatErrorChain(error, { includeStackTrace: true })).toBe("with stack\n    at frame1\n    at frame2")
  })

  test("formats an error made from a non-Error value", () => {
    const error = step("Wrapper", "wrapper failed", Throwable.apply("a string, not an Error"))
    expect(formatErrorChain(error, { includeTasks: true })).toContain("[Wrapper] wrapper failed")
  })
})

describe("isTaggedThrowable", () => {
  test("is true for a Throwable", () => {
    expect(isTaggedThrowable(Throwable.apply(new Error("x")))).toBe(true)
  })

  test("is false for a plain Error and for non-errors", () => {
    expect(isTaggedThrowable(new Error("x"))).toBe(false)
    expect(isTaggedThrowable({ _tag: "Throwable" })).toBe(false)
    expect(isTaggedThrowable(undefined)).toBe(false)
  })
})
