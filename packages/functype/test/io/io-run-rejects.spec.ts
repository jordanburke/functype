import { describe, expect, it } from "vitest"

import type { Exit as ExitType, IO as IOType } from "@/io"
import { InterruptedError, IO, Tag, UnsupportedSyncOperationError } from "@/io"

/**
 * In 2.0 `run()`'s `Either<E, A>` holds only typed errors (#276 §3).
 *
 * Before, a defect (a bug: a value the declared `E` says can't exist) and an interruption both
 * landed in the `Left`, typed as `E`. Now `run()` rejects with the defect, or with an
 * `InterruptedError`, and `runSync()` throws them. `runExit()` still reports all four outcomes and
 * never throws. Values the interpreter itself used to put in `E` become defects too.
 */

const rejection = async (run: () => Promise<unknown>): Promise<unknown> => {
  try {
    const value = await run()
    return { resolved: value }
  } catch (e) {
    return e
  }
}

const thrown = (run: () => unknown): unknown => {
  try {
    return { returned: run() }
  } catch (e) {
    return e
  }
}

describe("run() rejects on a defect or an interruption", () => {
  it("rejects with the defect from IO.die", async () => {
    const defect = new TypeError("bug")
    expect(await rejection(() => IO.die(defect).run())).toBe(defect)
  })

  it("rejects with the defect from a throwing map callback", async () => {
    const defect = new TypeError("map bug")
    const io = IO.succeed(1).map(() => {
      throw defect
    })
    expect(await rejection(() => io.run())).toBe(defect)
  })

  it("rejects with InterruptedError on IO.interrupt()", async () => {
    expect(await rejection(() => IO.interrupt().run())).toBeInstanceOf(InterruptedError)
  })

  it("rejects with InterruptedError when an IO.all sibling is interrupted from inside", async () => {
    const result = await rejection(() => IO.all([IO.sleep(5).flatMap(() => IO.interrupt()), IO.never()]).run())
    expect(result).toBeInstanceOf(InterruptedError)
  })

  it("still resolves Left for a typed failure", async () => {
    const result = await IO.fail("nope" as const).run()
    expect(result.isLeft() && result.value).toBe("nope")
  })

  it("still resolves Left for an IO.async rejection, whose E is unknown", async () => {
    const error = new Error("rejected")
    const result = await IO.async(() => Promise.reject(error)).run()
    expect(result.isLeft() && result.value).toBe(error)
  })

  it("still resolves Left for a recovered defect, mapped to a typed error", async () => {
    const result = await IO.die("bug")
      .mapError(() => "mapped" as const)
      .run()
    expect(result.isLeft() && result.value).toBe("mapped")
  })

  it("runCancellable's result still resolves Left(InterruptedError) after cancel()", async () => {
    const { result, cancel } = IO.never<number>().runCancellable()
    cancel()
    const either = await result
    expect(either.isLeft() && either.value).toBeInstanceOf(InterruptedError)
  })

  it("an interruptOn region's cancellation is a typed failure, so run() resolves Left", async () => {
    const controller = new AbortController()
    controller.abort()
    const result = await IO.succeed(1).interruptOn(controller.signal).run()
    expect(result.isLeft() && result.value).toBeInstanceOf(InterruptedError)
  })

  it("runExit() still never throws and reports each outcome", async () => {
    expect((await IO.die("bug").runExit()).isDie()).toBe(true)
    expect((await IO.interrupt().runExit()).isInterrupted()).toBe(true)
  })
})

describe("IO.tryCatch's mapped error is a typed failure, not a defect", () => {
  it("runExit reports Failure", async () => {
    const exit = await IO.tryCatch(
      () => {
        throw new Error("raw")
      },
      () => "mapped" as const,
    ).runExit()
    expect(exit.isFailure()).toBe(true)
    expect(exit.toValue().error).toBe("mapped")
  })

  it("run() resolves Left with the mapped error", async () => {
    const result = await IO.tryCatch(
      () => {
        throw new Error("raw")
      },
      () => "mapped" as const,
    ).run()
    expect(result.isLeft() && result.value).toBe("mapped")
  })

  it("a throwing error mapper is a defect", async () => {
    const exit = await IO.tryCatch(
      () => {
        throw new Error("raw")
      },
      (): string => {
        throw new Error("mapper bug")
      },
    ).runExit()
    expect(exit.isDie()).toBe(true)
  })

  it("succeeds with the value when nothing throws", async () => {
    expect(await IO.tryCatch(() => 7, String).runOrThrow()).toBe(7)
    expect(IO.tryCatch(() => 7, String).runSyncOrThrow()).toBe(7)
  })
})

describe("values the interpreter put in E are defects", () => {
  const isDie = (exit: ExitType<unknown, unknown>): boolean => exit.isDie()

  it("IO.race([])", async () => {
    expect(isDie(await IO.race<never, never, never>([]).runExit())).toBe(true)
  })

  it("IO.any([])", async () => {
    expect(isDie(await IO.any<never, never, never>([]).runExit())).toBe(true)
  })

  it("IO.firstSuccessOf([])", async () => {
    expect(isDie(await IO.firstSuccessOf<never, never, never>([]).runExit())).toBe(true)
  })

  it("a service that was never provided", async () => {
    const Missing = Tag<{ readonly n: number }>("Missing")
    const exit = await (IO.service(Missing) as unknown as IOType<never, never, { readonly n: number }>).runExit()
    expect(isDie(exit)).toBe(true)
    expect(String((exit.toValue().defect as Error).message)).toContain("Service not found: Missing")
  })
})

describe("runSync() tells typed failures from defects", () => {
  it("returns Left for a typed failure", () => {
    const result = IO.fail("nope" as const).runSync()
    expect(result.isLeft() && result.value).toBe("nope")
  })

  it("returns Left for a throwing IO(...) thunk, whose E is unknown", () => {
    const error = new Error("thrown")
    const result = IO(() => {
      throw error
    }).runSync()
    expect(result.isLeft() && result.value).toBe(error)
  })

  it("returns Left for IO.tryCatch's mapped error", () => {
    const result = IO.tryCatch(
      () => {
        throw new Error("raw")
      },
      () => "mapped" as const,
    ).runSync()
    expect(result.isLeft() && result.value).toBe("mapped")
  })

  it("throws the defect from IO.die", () => {
    const defect = new TypeError("bug")
    expect(thrown(() => IO.die(defect).runSync())).toBe(defect)
  })

  it("throws the defect from a throwing IO.sync thunk", () => {
    const defect = new TypeError("thunk bug")
    const io = IO.sync(() => {
      throw defect
    })
    expect(thrown(() => io.runSync())).toBe(defect)
  })

  it("throws InterruptedError on IO.interrupt()", () => {
    expect(thrown(() => IO.interrupt().runSync())).toBeInstanceOf(InterruptedError)
  })

  it("throws for a missing service", () => {
    const Missing = Tag<number>("MissingSync")
    const io = IO.service(Missing) as unknown as IOType<never, never, number>
    expect(thrown(() => io.runSync())).toBeInstanceOf(Error)
  })

  it("throws for an async effect, which it can't run", () => {
    expect(thrown(() => IO.async(() => Promise.resolve(1)).runSync())).toBeInstanceOf(Error)
  })

  it("lets recover catch a defect, as the async interpreter does", () => {
    expect(IO.die("bug").recover(7).runSync().orThrow()).toBe(7)
  })

  it("still keeps UnsupportedSyncOperationError past recover, and throws it", () => {
    expect(thrown(() => IO.succeed(1).timeout(5).recover(7).runSync())).toBeInstanceOf(UnsupportedSyncOperationError)
  })

  it("runSyncOrThrow throws the typed error itself", () => {
    expect(thrown(() => IO.fail("nope" as const).runSyncOrThrow())).toBe("nope")
  })

  it("an already-aborted interruptOn region is a typed failure that catchTag can handle", () => {
    const controller = new AbortController()
    controller.abort()
    const result = IO.succeed(1)
      .interruptOn(controller.signal)
      .catchTag("InterruptedError", () => IO.succeed(0))
      .runSync()
    expect(result.orThrow()).toBe(0)
  })

  it("an IO.interrupt() inside a region becomes the region's typed failure", () => {
    const signal = new AbortController().signal
    const result = IO.interrupt().interruptOn(signal).runSync()
    expect(result.isLeft() && result.value).toBeInstanceOf(InterruptedError)
  })

  it("recover can't swallow an interruption outside any region", () => {
    expect(thrown(() => IO.interrupt().recover(7).runSync())).toBeInstanceOf(InterruptedError)
  })

  it("bracketExit's release sees Die for a defect in use", () => {
    const seen: string[] = []
    const io = IO.bracketExit(
      IO.succeed("resource"),
      () =>
        IO.sync((): number => {
          throw new TypeError("use bug")
        }),
      (_, exit) =>
        IO.sync(() => {
          seen.push(exit.isDie() ? "die" : exit.isFailure() ? "failure" : "other")
        }),
    )
    expect(thrown(() => io.runSync())).toBeInstanceOf(TypeError)
    expect(seen).toEqual(["die"])
  })

  it("bracketExit's release sees Failure for a typed failure in use", () => {
    const seen: string[] = []
    const io = IO.bracketExit(
      IO.succeed("resource"),
      () => IO.fail("typed" as const),
      (_, exit) =>
        IO.sync(() => {
          seen.push(exit.isDie() ? "die" : exit.isFailure() ? "failure" : "other")
        }),
    )
    expect(io.runSync().isLeft()).toBe(true)
    expect(seen).toEqual(["failure"])
  })

  it("bracket still releases when use's callback itself throws", () => {
    const log: string[] = []
    const io = IO.bracket(
      IO.succeed("resource"),
      (): IOType<never, never, number> => {
        throw new TypeError("callback bug")
      },
      () =>
        IO.sync(() => {
          log.push("released")
        }),
    )
    expect(thrown(() => io.runSync())).toBeInstanceOf(TypeError)
    expect(log).toEqual(["released"])
  })
})
