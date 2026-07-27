import { IO } from "functype/io"
import { describe, expect, it } from "vitest"

import { formatIOError, IOQueryError, ioMutationFn } from "../../src/query"

/**
 * Two guarantees the query bridge makes about errors, both of which it used to break.
 */
describe("error boxing", () => {
  /**
   * `formatIOError` supplies `IOQueryError.message` by default, so whatever it discards
   * is what the user reads in the UI. A raw `Error` already had `.message` preferred and
   * an untagged object already got a JSON rendering — a *tagged* object with a `message`
   * was the one shape where information already present was thrown away (#258).
   */
  describe("formatIOError", () => {
    it("prefers a tagged error's own message over its tag", () => {
      expect(formatIOError({ _tag: "AuthError", message: "No session" })).toBe("No session")
    })

    it("still renders the HTTP variants structurally", () => {
      const httpStatus = {
        _tag: "HttpStatusError",
        url: "/api/x",
        method: "GET",
        status: 403,
        statusText: "Forbidden",
        body: "{}",
      }

      expect(formatIOError(httpStatus)).toBe("HTTP 403 Forbidden — /api/x")
    })

    // No `HttpError` variant carries a `message`, so a status-bearing error can never
    // reach the message branch — but a status must win even if one ever did.
    it("prefers the status rendering over a message when both are present", () => {
      expect(formatIOError({ _tag: "HttpStatusError", url: "/api/x", status: 500, message: "ignored" })).toBe(
        "HTTP 500 — /api/x",
      )
    })

    it("falls back to the tag when there is no usable message", () => {
      expect(formatIOError({ _tag: "AuthError" })).toBe("AuthError")
      expect(formatIOError({ _tag: "AuthError", message: "" })).toBe("AuthError")
      expect(formatIOError({ _tag: "AuthError", message: 42 })).toBe("AuthError")
    })

    it("leaves the non-tagged paths alone", () => {
      expect(formatIOError(new Error("boom"))).toBe("boom")
      expect(formatIOError({ foo: "bar" })).toBe('{"foo":"bar"}')
      expect(formatIOError("plain")).toBe("plain")
    })

    it("reaches the message through the hook path, not just direct calls", async () => {
      const fn = ioMutationFn(() => IO.fail({ _tag: "AuthError" as const, message: "No session" }))

      await expect(fn()).rejects.toThrow("No session")
    })
  })

  /**
   * `defect: false` is documented to mean "`.error` really is an `E`", and consumers are
   * told to check it before matching on `_tag`. That guard was unsound: anything that
   * reached the error channel without being a typed failure — a throwing error-mapper, a
   * throwing `IO.sync` thunk, `IO.die` — arrived as an ordinary `Left` and read
   * `defect: false` while carrying something that was not an `E` (#259).
   */
  describe("IOQueryError.defect", () => {
    const boxedFrom = async (fn: () => Promise<unknown>): Promise<IOQueryError<unknown>> => {
      try {
        await fn()
      } catch (e) {
        if (e instanceof IOQueryError) return e as IOQueryError<unknown>
        throw e
      }
      throw new Error("expected the effect to reject")
    }

    it("is false for a genuine typed failure, which is an E", async () => {
      const boxed = await boxedFrom(ioMutationFn(() => IO.fail({ _tag: "AuthError" as const, message: "no session" })))

      expect(boxed.defect).toBe(false)
      expect(boxed.error).toEqual({ _tag: "AuthError", message: "no session" })
    })

    it("is true when the effect factory throws", async () => {
      const boxed = await boxedFrom(
        ioMutationFn(() => {
          throw new Error("factory bug")
        }),
      )

      expect(boxed.defect).toBe(true)
    })

    // The reported case.
    it("is true when the catch handler throws", async () => {
      const boxed = await boxedFrom(
        ioMutationFn(() =>
          IO.tryPromise({
            try: () => Promise.reject(new Error("original")),
            catch: () => {
              throw new Error("mapper bug")
            },
          }),
        ),
      )

      expect(boxed.defect).toBe(true)
      expect((boxed.error as Error).message).toBe("mapper bug")
    })

    it("is true for a throwing IO.sync thunk", async () => {
      const boxed = await boxedFrom(
        ioMutationFn(() =>
          IO.sync<number>(() => {
            throw new Error("thunk bug")
          }),
        ),
      )

      expect(boxed.defect).toBe(true)
    })

    it("is true for IO.die", async () => {
      const boxed = await boxedFrom(ioMutationFn(() => IO.die(new Error("died"))))

      expect(boxed.defect).toBe(true)
    })

    it("is true for interruption, whose InterruptedError is no more an E than a defect", async () => {
      const boxed = await boxedFrom(ioMutationFn(() => IO.interrupt()))

      expect(boxed.defect).toBe(true)
    })

    /**
     * The invariant itself, stated as the docs state it: whenever `defect` is `false`,
     * following the prescribed guard and matching on `_tag` must actually work.
     */
    it("holds the documented invariant across every path", async () => {
      const paths = [
        () => IO.fail({ _tag: "AuthError" as const, message: "no session" }),
        () => {
          throw new Error("factory bug")
        },
        () =>
          IO.tryPromise({
            try: () => Promise.reject(new Error("original")),
            catch: () => {
              throw new Error("mapper bug")
            },
          }),
        () =>
          IO.sync<number>(() => {
            throw new Error("thunk bug")
          }),
        () => IO.die(new Error("died")),
        () => IO.interrupt(),
      ]

      for (const path of paths) {
        const boxed = await boxedFrom(ioMutationFn(path as () => IO<never, unknown, unknown>))

        if (!boxed.defect) {
          expect(typeof (boxed.error as { _tag?: unknown })._tag).toBe("string")
        }
      }
    })

    it("still lets a defect be recovered before it ever reaches the bridge", async () => {
      const fn = ioMutationFn(() =>
        IO.sync<number>(() => {
          throw new Error("thunk bug")
        }).recover(42),
      )

      await expect(fn()).resolves.toBe(42)
    })

    it("still boxes an Error subclass so React Query's handlers keep working", async () => {
      const boxed = await boxedFrom(ioMutationFn(() => IO.fail({ _tag: "AuthError" as const, message: "no session" })))

      expect(boxed).toBeInstanceOf(Error)
      expect(boxed.name).toBe("IOQueryError")
      expect(boxed.message).toBe("no session")
    })
  })
})
