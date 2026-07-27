import { describe, expect, it } from "vitest"

import type { IO as IOType } from "@/io"
import { Exit, InterruptedError, IO } from "@/io"

/**
 * `Exit.Die` separates a *defect* — a value in the error channel that the declared `E`
 * says cannot exist — from a genuine typed failure.
 *
 * Before it, both collapsed into `Failure`, so a consumer asking "is `.error` really an
 * `E`?" had no way to find out: `IO.sync(() => { throw x })` and `IO.fail(e)` produced
 * indistinguishable outcomes despite `IO.sync` declaring `E = never` (#259).
 *
 * The dividing line is the *declared* error channel, not whether something threw:
 * `IO.async` and the `IO(...)` constructor declare `E = unknown`, so their rejections
 * are legitimate errors and must stay `Failure`.
 */
describe("defects are distinguishable from typed failures", () => {
  describe("what produces a Die", () => {
    it("IO.die", async () => {
      const defect = new Error("died")
      const exit = await IO.die(defect).runExit()

      expect(exit.isDie()).toBe(true)
      expect(exit.isFailure()).toBe(false)
      expect(exit.toValue().defect).toBe(defect)
    })

    it("a throwing IO.sync thunk", async () => {
      const exit = await IO.sync(() => {
        throw new Error("thunk bug")
      }).runExit()

      expect(exit.isDie()).toBe(true)
    })

    it("a throwing map callback", async () => {
      const exit = await IO.succeed(1)
        .map(() => {
          throw new Error("map bug")
        })
        .runExit()

      expect(exit.isDie()).toBe(true)
    })

    it("a throwing flatMap callback", async () => {
      const exit = await IO.succeed(1)
        .flatMap((): IOType<never, never, number> => {
          throw new Error("flatMap bug")
        })
        .runExit()

      expect(exit.isDie()).toBe(true)
    })

    // The reported repro: the error-*mapper* itself has a bug. Its declared return is an
    // `E`, so what it throws instead cannot be one.
    it("a throwing tryPromise catch handler", async () => {
      const exit = await IO.tryPromise({
        try: () => Promise.reject(new Error("original")),
        catch: () => {
          throw new Error("mapper bug")
        },
      }).runExit()

      expect(exit.isDie()).toBe(true)
      expect((exit.toValue().defect as Error).message).toBe("mapper bug")
    })

    it("a throwing mapError handler", async () => {
      const exit = await IO.fail(new Error("boom"))
        .mapError(() => {
          throw new Error("mapper bug")
        })
        .runExit()

      expect(exit.isDie()).toBe(true)
    })
  })

  describe("what stays a Failure", () => {
    it("IO.fail", async () => {
      const exit = await IO.fail({ _tag: "AuthError" as const }).runExit()

      expect(exit.isFailure()).toBe(true)
      expect(exit.isDie()).toBe(false)
    })

    // `IO.async` is `IO<never, unknown, A>` — a rejection *is* the declared channel.
    it("an IO.async rejection", async () => {
      const exit = await IO.async(() => Promise.reject(new Error("rejected"))).runExit()

      expect(exit.isFailure()).toBe(true)
      expect(exit.isDie()).toBe(false)
    })

    it("an IO(...) constructor rejection", async () => {
      const exit = await IO(() => Promise.reject(new Error("rejected"))).runExit()

      expect(exit.isFailure()).toBe(true)
    })

    /**
     * The load-bearing regression. `IO.tryPromise` is `async(...).mapError(catch)`, so if
     * a rejection were classified as a defect it would sail straight past `MapError`'s
     * error-channel branch and the `catch` handler would never run — silently disabling
     * every typed error mapping in the library.
     */
    it("a tryPromise rejection reaches its catch handler and stays a Failure", async () => {
      const exit = await IO.tryPromise({
        try: () => Promise.reject(new Error("original")),
        catch: () => ({ _tag: "NetworkError" as const }),
      }).runExit()

      expect(exit.isFailure()).toBe(true)
      expect(exit.toValue().error).toEqual({ _tag: "NetworkError" })
    })

    it("interruption is Interrupted, not Die", async () => {
      const exit = await IO.interrupt().runExit()

      expect(exit.isInterrupted()).toBe(true)
      expect(exit.isDie()).toBe(false)
    })
  })

  /**
   * Deliberate: `Die` is an observability fix, not a control-flow one. Promoting defects
   * to uncatchable (the ZIO model) would silently change what every existing `.recover()`
   * catches, so recovery treats a defect exactly as it treated one before.
   */
  describe("defects remain recoverable", () => {
    const dies = () =>
      IO.sync<number>(() => {
        throw new Error("defect")
      })

    it("recover turns a defect into the fallback", async () => {
      const exit = await dies().recover(42).runExit()

      expect(exit.isSuccess()).toBe(true)
      expect(exit.orThrow()).toBe(42)
    })

    it("recoverWith receives the defect", async () => {
      const seen: unknown[] = []
      const exit = await dies()
        .recoverWith((e) => {
          seen.push(e)
          return IO.succeed(7)
        })
        .runExit()

      expect(exit.orThrow()).toBe(7)
      expect((seen[0] as Error).message).toBe("defect")
    })

    it("fold routes a defect to onFailure", async () => {
      const exit = await dies()
        .fold(
          () => "recovered",
          () => "ok",
        )
        .runExit()

      expect(exit.orThrow()).toBe("recovered")
    })

    // Mapping a defect yields a *Failure*: the caller's mapper returns a genuine `E`, so
    // from that point on the outcome really is a typed failure.
    it("mapError rewrites a defect into a typed failure", async () => {
      const exit = await dies()
        .mapError(() => ({ _tag: "Mapped" as const }))
        .runExit()

      expect(exit.isFailure()).toBe(true)
      expect(exit.isDie()).toBe(false)
      expect(exit.toValue().error).toEqual({ _tag: "Mapped" })
    })
  })

  /**
   * `Either` has no third branch, so `run()` cannot express a defect. It keeps putting the
   * raw value in the `Left` exactly as before — `runExit()` is the terminal that carries
   * the distinction, and no existing caller changes behaviour.
   */
  describe("the Either terminals are unchanged", () => {
    it("run puts a defect in the Left, raw", async () => {
      const defect = new Error("defect")
      const result = await IO.sync(() => {
        throw defect
      }).run()

      expect(result.isLeft()).toBe(true)
      expect(result.isLeft() && result.value).toBe(defect)
    })

    it("runOrThrow throws the defect itself", async () => {
      const defect = new Error("defect")

      await expect(
        IO.sync(() => {
          throw defect
        }).runOrThrow(),
      ).rejects.toBe(defect)
    })

    it("runSync puts a defect in the Left, raw", () => {
      const defect = new Error("defect")
      const result = IO.sync(() => {
        throw defect
      }).runSync()

      expect(result.isLeft() && result.value).toBe(defect)
    })

    it("run still surfaces interruption as InterruptedError", async () => {
      const result = await IO.interrupt().run()

      expect(result.isLeft() && result.value).toBeInstanceOf(InterruptedError)
    })
  })

  describe("Exit.Die as a value", () => {
    const die = Exit.die<string, number>(new Error("boom"))

    it("is guarded by both the method and the companion", () => {
      expect(die.isDie()).toBe(true)
      expect(Exit.isDie(die)).toBe(true)
      expect(Exit.isDie(Exit.fail<string, number>("e"))).toBe(false)
    })

    it("fold routes to onDie when supplied", () => {
      const seen = die.fold(
        () => "failure",
        () => "success",
        () => "interrupted",
        () => "die",
      )

      expect(seen).toBe("die")
    })

    // Back-compat: the pre-Die three-argument call still compiles and still sees the
    // defect, because that is where it used to arrive.
    it("fold falls back to onFailure when onDie is omitted", () => {
      const seen = die.fold(
        (e) => `failure:${(e as unknown as Error).message}`,
        () => "success",
      )

      expect(seen).toBe("failure:boom")
    })

    it("match routes to Die when supplied, and to Failure when not", () => {
      const patterns = {
        Success: () => "success",
        Failure: () => "failure",
        Interrupted: () => "interrupted",
      }

      expect(die.match({ ...patterns, Die: () => "die" })).toBe("die")
      expect(die.match(patterns)).toBe("failure")
    })

    it("passes through the mapping combinators untouched", () => {
      expect(die.map((n) => n + 1).isDie()).toBe(true)
      expect(die.flatMap(() => Exit.succeed<string, number>(1)).isDie()).toBe(true)
      // `mapError` is typed `(e: E) => E2` and a defect is not an `E`, so the callback
      // must not see it — the same reason Interrupted passes through.
      expect(die.mapError(() => "mapped").isDie()).toBe(true)
      expect(
        die
          .mapBoth(
            () => "mapped",
            (n) => n,
          )
          .isDie(),
      ).toBe(true)
    })

    it("extracts like a Failure", () => {
      expect(() => die.orThrow()).toThrow("boom")
      expect(die.orElse(9)).toBe(9)
      expect(die.toOption().isEmpty).toBe(true)
      expect(die.toEither().isLeft()).toBe(true)
    })

    it("renders and serializes with its own tag", () => {
      expect(die._tag).toBe("Die")
      expect(die.toString()).toContain("Exit.Die")
      expect(die.toJSON()._tag).toBe("Die")
    })

    it("short-circuits zip and all", () => {
      expect(Exit.zip(Exit.succeed<string, number>(1), die).isDie()).toBe(true)
      expect(Exit.all([Exit.succeed<string, number>(1), die]).isDie()).toBe(true)
    })
  })

  /**
   * `bracketExit`'s release is contracted to receive the Exit describing how `use` ended,
   * so a defect must arrive as one rather than masquerading as a typed failure.
   */
  it("bracketExit release sees a Die when use produces a defect", async () => {
    const seen: string[] = []

    await IO.bracketExit(
      IO.succeed("resource"),
      () =>
        IO.sync<string>(() => {
          throw new Error("use blew up")
        }),
      (_resource, exit) =>
        IO.sync<void>(() => {
          seen.push(exit._tag)
        }),
    ).runExit()

    expect(seen).toEqual(["Die"])
  })
})
