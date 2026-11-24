import { describe, expect, it } from "vitest"

import * as core from "@/core/exports"
import * as root from "@/index"

/** `functype/core` is a curated short list of the root export (#141): the same values, fewer names. */
describe("functype/core", () => {
  const names = Object.keys(core).sort()

  it("exports the curated names", () => {
    expect(names).toEqual(
      [
        "Either",
        "IO",
        "Left",
        "List",
        "Map",
        "None",
        "Option",
        "Right",
        "Set",
        "Some",
        "Tag",
        "Try",
        "Tuple",
        "isLeft",
        "isRight",
        "tryCatch",
        "tryCatchAsync",
      ].sort(),
    )
  })

  it.each(names)("%s is the same value as the root export", (name) => {
    expect(core[name as keyof typeof core]).toBe(root[name as keyof typeof root])
  })

  it("covers a typical program", () => {
    const port = core
      .Option("8080")
      .map(Number)
      .getOrElse(() => 3000)
    const parsed = core.tryCatch(
      () => JSON.parse("{}") as unknown,
      (e) => String(e),
    )
    const ran = core.IO.succeed(2)
      .map((n) => n * 3)
      .runSync()
    expect(port).toBe(8080)
    expect(parsed.isRight()).toBe(true)
    expect(ran).toEqual(core.Right(6))
    expect(
      core
        .List([1, 2])
        .map((n) => n + 1)
        .toArray(),
    ).toEqual([2, 3])
  })
})
