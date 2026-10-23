import { describe, expect, it } from "vitest"

import { Exit, IO } from "@/io"

/**
 * Each `Exit` guard narrows to a type with a payload field: `isSuccess()` to `.value`, `isFailure()` to
 * `.error`, `isDie()` to `.defect`, `isInterrupted()` to `.fiberId`. Before 1.17 the objects had none of
 * those fields, so `exit.isSuccess() && exit.value` type-checked and returned `undefined` (#276 §9).
 */
describe("Exit guards read the field they narrow to", () => {
  it("isSuccess() exposes .value", () => {
    const exit = Exit.succeed<Error, number>(42)
    expect(exit.isSuccess() ? exit.value : undefined).toBe(42)
  })

  it("isFailure() exposes .error", () => {
    const error = new Error("boom")
    const exit = Exit.fail<Error, number>(error)
    expect(exit.isFailure() ? exit.error : undefined).toBe(error)
  })

  it("isDie() exposes .defect", () => {
    const defect = { reason: "bug" }
    const exit = Exit.die<Error, number>(defect)
    expect(exit.isDie() ? exit.defect : undefined).toBe(defect)
  })

  it("isInterrupted() exposes .fiberId", () => {
    const exit = Exit.interrupt<Error, number>("fiber-7")
    expect(exit.isInterrupted() ? exit.fiberId : undefined).toBe("fiber-7")
  })

  it("the companion guards narrow the same way", () => {
    const die = Exit.die<Error, number>("defect")
    expect(Exit.isDie(die) ? die.defect : undefined).toBe("defect")
    const ok = Exit.succeed<Error, number>(1)
    expect(Exit.isSuccess(ok) ? ok.value : undefined).toBe(1)
  })

  it("an Exit from runExit carries the fields too", async () => {
    const success = await IO.succeed(5).runExit()
    expect(success.isSuccess() ? success.value : undefined).toBe(5)

    const failure = await IO.fail("nope").runExit()
    expect(failure.isFailure() ? failure.error : undefined).toBe("nope")

    const die = await IO.sync<number>(() => {
      throw new Error("defect")
    }).runExit()
    expect(die.isDie() ? (die.defect as Error).message : undefined).toBe("defect")
  })

  it("map and flatMap results carry the field", () => {
    const mapped = Exit.succeed<Error, number>(2).map((n) => n * 10)
    expect(mapped.isSuccess() ? mapped.value : undefined).toBe(20)
    const flat = Exit.succeed<Error, number>(2).flatMap((n) => Exit.fail<Error, number>(new Error(`n=${n}`)))
    expect(flat.isFailure() ? flat.error.message : undefined).toBe("n=2")
  })

  it("serialization is unchanged", () => {
    expect(JSON.stringify(Exit.succeed(1))).toBe('{"_tag":"Success","value":1}')
    expect(Exit.fail("e").toValue()).toEqual({ _tag: "Failure", error: "e" })
    expect(Exit.interrupt("f").toString()).toBe("Exit.Interrupted(f)")
  })
})
