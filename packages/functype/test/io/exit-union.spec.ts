/**
 * Exit is a discriminated union of four variants (#276 §9), so TypeScript narrows it the way it
 * narrows Either. Before, the guards narrowed to an intersection, so the else branch stayed a plain
 * `Exit` and a `_tag` check narrowed nothing.
 */
import { describe, expect, expectTypeOf, it } from "vitest"

import {
  type DieExitOf,
  Exit,
  type ExitType,
  type FailureExitOf,
  type InterruptedExitOf,
  type SuccessExitOf,
} from "@/index"

const describeExit = (exit: ExitType<string, number>): string => {
  switch (exit._tag) {
    case "Success":
      return `value ${exit.value}`
    case "Failure":
      return `error ${exit.error}`
    case "Die":
      return `defect ${String(exit.defect)}`
    case "Interrupted":
      return `fiber ${exit.fiberId}`
  }
}

describe("Exit narrows", () => {
  it("on _tag, and a switch over it is exhaustive", () => {
    expect(describeExit(Exit.succeed(1))).toBe("value 1")
    expect(describeExit(Exit.fail("e"))).toBe("error e")
    expect(describeExit(Exit.die("d"))).toBe("defect d")
    expect(describeExit(Exit.interrupt("f"))).toBe("fiber f")
  })

  it("on each guard, and the else branch keeps the other variants", () => {
    const exit: ExitType<string, number> = Exit.succeed(2)
    if (exit.isSuccess()) {
      expectTypeOf(exit).toEqualTypeOf<SuccessExitOf<string, number>>()
      expectTypeOf(exit.value).toEqualTypeOf<number>()
    } else {
      expectTypeOf(exit).toEqualTypeOf<
        FailureExitOf<string, number> | DieExitOf<string, number> | InterruptedExitOf<string, number>
      >()
    }
    if (exit.isFailure()) expectTypeOf(exit.error).toEqualTypeOf<string>()
    if (exit.isDie()) expectTypeOf(exit.defect).toEqualTypeOf<unknown>()
    if (exit.isInterrupted()) expectTypeOf(exit.fiberId).toEqualTypeOf<string>()
    expect(exit.isSuccess() && exit.value).toBe(2)
  })

  it("through the companion guards", () => {
    const exit: ExitType<string, number> = Exit.fail("bad")
    if (Exit.isFailure(exit)) expectTypeOf(exit).toEqualTypeOf<FailureExitOf<string, number>>()
    if (Exit.isSuccess(exit)) expectTypeOf(exit).toEqualTypeOf<SuccessExitOf<string, number>>()
    if (Exit.isDie(exit)) expectTypeOf(exit).toEqualTypeOf<DieExitOf<string, number>>()
    if (Exit.isInterrupted(exit)) expectTypeOf(exit).toEqualTypeOf<InterruptedExitOf<string, number>>()
    expect(Exit.isFailure(exit) && exit.error).toBe("bad")
  })

  it("its _tag is the union of the four tags", () => {
    expectTypeOf<ExitType<string, number>["_tag"]>().toEqualTypeOf<"Success" | "Failure" | "Die" | "Interrupted">()
  })
})
