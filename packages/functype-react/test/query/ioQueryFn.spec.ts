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
})
