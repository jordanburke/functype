import { describe, expect, it } from "vitest"

import { IO } from "@/io"

/**
 * `bracketExit`'s contract is that `release` receives the `Exit` describing how `use`
 * ended, so cleanup can branch on cancellation — a distinct rollback path, or telemetry
 * that shouldn't count cancellations as failures.
 *
 * The sync interpreter built that Exit from a caught throw and so always reported
 * `Failure`, disagreeing with the async interpreter, which passes the real Exit through.
 * Recorded on #242; the error itself was never lost (the catch rethrows), only
 * `release`'s view of *why*.
 */
describe("bracketExit reports interruption to release", () => {
  const spy = () => {
    const seen: string[] = []
    const release = (_resource: string, exit: { isSuccess: () => boolean; isInterrupted: () => boolean }) =>
      IO.sync(() => {
        seen.push(exit.isInterrupted() ? "interrupted" : exit.isSuccess() ? "success" : "failure")
      })
    return { seen, release }
  }

  it("sync: release sees Interrupted, not Failure", () => {
    const { seen, release } = spy()

    IO.bracketExit(IO.succeed("resource"), () => IO.interrupt(), release).runSync()

    expect(seen).toEqual(["interrupted"])
  })

  it("async: release sees Interrupted (unchanged)", async () => {
    const { seen, release } = spy()

    await IO.bracketExit(IO.succeed("resource"), () => IO.interrupt(), release).runExit()

    expect(seen).toEqual(["interrupted"])
  })

  // Regressions: the other two outcomes must still be reported as they were.
  it("sync: release still sees Failure for a genuine failure", () => {
    const { seen, release } = spy()

    IO.bracketExit(IO.succeed("resource"), () => IO.fail(new Error("boom")), release).runSync()

    expect(seen).toEqual(["failure"])
  })

  it("sync: release still sees Success when use succeeds", () => {
    const { seen, release } = spy()

    IO.bracketExit(IO.succeed("resource"), () => IO.succeed("ok"), release).runSync()

    expect(seen).toEqual(["success"])
  })

  it("sync: the interruption still propagates to the caller", () => {
    const { release } = spy()

    const result = IO.bracketExit(IO.succeed("resource"), () => IO.interrupt(), release).runSync()

    expect(result.isLeft()).toBe(true)
  })
})
