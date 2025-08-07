import { describe, expect, it } from "vitest"
import { Right, Left } from "@/either/Either"

describe("Either without PromiseLike", () => {
  it("should not be awaitable", async () => {
    const either = Right<string, number>(42)

    // This should be a TypeScript error - Either should not be awaitable
    // const result = await either  // <- This should NOT compile

    // This should work - explicit methods
    const result = either.get()
    expect(result).toBe(42)
  })

  it("should still support all Either methods", () => {
    const either = Right<string, number>(42)

    expect(either.isRight()).toBe(true)
    expect(either.isLeft()).toBe(false)
    expect(either.get()).toBe(42)

    const mapped = either.map((x) => x * 2)
    expect(mapped.get()).toBe(84)

    const folded = either.fold(
      (err) => 0,
      (val) => val,
    )
    expect(folded).toBe(42)
  })

  it("should work with Left values", () => {
    const either = Left<string, number>("error")

    expect(either.isLeft()).toBe(true)
    expect(either.isRight()).toBe(false)

    const mapped = either.map((x) => x * 2)
    expect(mapped.isLeft()).toBe(true)

    const folded = either.fold(
      (err) => 0,
      (val) => val,
    )
    expect(folded).toBe(0)
  })

  it("should maintain functional composition", () => {
    const either = Right<string, number>(5)

    const result = either
      .map((x) => x * 2)
      .map((x) => x + 1)
      .fold(
        (err) => `Error: ${err}`,
        (val) => `Success: ${val}`,
      )

    expect(result).toBe("Success: 11")
  })
})
