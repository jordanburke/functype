import { IO } from "functype/io"
import { describe, expect, it } from "vitest"

import { ioMutationFn, ioQueryFn } from "../../src/query/ioQueryFn"
import { IOQueryError } from "../../src/query/IOQueryError"

type StatusError = {
  readonly _tag: "HttpStatusError"
  readonly url: string
  readonly status: number
  readonly statusText: string
}

const forbidden: StatusError = {
  _tag: "HttpStatusError",
  url: "/api/limits",
  status: 403,
  statusText: "Forbidden",
}

const context = () => ({ signal: new AbortController().signal })

describe("ioQueryFn", () => {
  it("resolves with the Right value", async () => {
    const queryFn = ioQueryFn<StatusError, number>(() => IO.succeed(42))
    await expect(queryFn(context())).resolves.toBe(42)
  })

  it("rejects with an IOQueryError carrying the Left value", async () => {
    const queryFn = ioQueryFn<StatusError, number>(() => IO.fail(forbidden))

    await expect(queryFn(context())).rejects.toBeInstanceOf(IOQueryError)

    const error = await queryFn(context()).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as IOQueryError<StatusError>).error).toBe(forbidden)
    expect((error as IOQueryError<StatusError>).message).toBe("HTTP 403 Forbidden — /api/limits")
  })

  it("applies a formatError override", async () => {
    const queryFn = ioQueryFn<StatusError, number>(() => IO.fail(forbidden), {
      formatError: (e) => `tier cap hit (${e.status})`,
    })

    const error = await queryFn(context()).catch((e: unknown) => e)
    expect((error as IOQueryError<StatusError>).message).toBe("tier cap hit (403)")
  })

  // A factory throw happens before any IO exists, so the interpreter's own defect
  // handling never sees it. Unboxed, it would reject with a raw value while the
  // declared error type says IOQueryError — leaving `.error` undefined.
  it("boxes a synchronous throw from the effect factory as a defect", async () => {
    const queryFn = ioQueryFn<StatusError, number>(() => {
      throw new Error("factory blew up")
    })

    const error = await queryFn(context()).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(IOQueryError)
    expect((error as IOQueryError<unknown>).defect).toBe(true)
    expect((error as IOQueryError<unknown>).error).toBeInstanceOf(Error)
    expect((error as IOQueryError<unknown>).message).toBe("factory blew up")
  })

  it("marks a typed Left as a non-defect", async () => {
    const queryFn = ioQueryFn<StatusError, number>(() => IO.fail(forbidden))
    const error = await queryFn(context()).catch((e: unknown) => e)

    expect((error as IOQueryError<StatusError>).defect).toBe(false)
  })

  it("passes the AbortSignal through to the effect factory", async () => {
    const controller = new AbortController()
    let seen: AbortSignal | undefined

    const queryFn = ioQueryFn<never, string>(({ signal }) => {
      seen = signal
      return IO.succeed("ok")
    })

    await queryFn({ signal: controller.signal })
    expect(seen).toBe(controller.signal)
  })
})

describe("ioQueryFn cancellation", () => {
  it("a cancelled query stops the effect, and rejects with an interruption marked as a defect, not an E", async () => {
    const counter = { n: 0 }
    const loop = IO.iterate(
      0,
      (i: number) =>
        IO.sleep(1).map(() => {
          counter.n += 1
          return i + 1
        }),
      () => false,
      { max: 1_000_000 },
    )
    const controller = new AbortController()
    const pending = ioQueryFn(() => loop)({ signal: controller.signal }).catch((e: unknown) => e)

    await new Promise((resolve) => setTimeout(resolve, 20))
    controller.abort()
    const error = await pending

    expect(error).toBeInstanceOf(IOQueryError)
    expect((error as IOQueryError<unknown>).defect).toBe(true)
    const snapshot = counter.n
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(counter.n).toBe(snapshot)
  })
})

describe("ioMutationFn", () => {
  it("resolves with the Right value and receives the variables", async () => {
    const mutationFn = ioMutationFn<never, string, { name: string }>((vars) => IO.succeed(`created ${vars.name}`))
    await expect(mutationFn({ name: "ci" })).resolves.toBe("created ci")
  })

  it("rejects with an IOQueryError carrying the Left value", async () => {
    const mutationFn = ioMutationFn<StatusError, string, void>(() => IO.fail(forbidden))

    const error = await mutationFn(undefined).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(IOQueryError)
    expect((error as IOQueryError<StatusError>).error.status).toBe(403)
  })

  it("boxes a synchronous throw from the effect factory as a defect", async () => {
    const mutationFn = ioMutationFn<StatusError, string, void>(() => {
      throw new Error("factory blew up")
    })

    const error = await mutationFn(undefined).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(IOQueryError)
    expect((error as IOQueryError<unknown>).defect).toBe(true)
  })
})
