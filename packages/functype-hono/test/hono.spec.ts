import type { IOType } from "functype"
import { InterruptedError, IO } from "functype"
import type { Context } from "hono"
import { Hono } from "hono"
import type { ClientResponse, InferResponseType } from "hono/client"
import { hc } from "hono/client"
import { validator } from "hono/validator"
import { describe, expect, expectTypeOf, it } from "vitest"

import { respond } from "../src"
import type { CallError, SuccessBody } from "../src/client"
import { call } from "../src/client"

type User = { readonly id: string; readonly name: string }
type AppError =
  | { readonly _tag: "NotFound"; readonly id: string }
  | { readonly _tag: "Forbidden" }
  | { readonly _tag: "Invalid"; readonly reason: string }

const users: ReadonlyMap<string, User> = new Map([["1", { id: "1", name: "Ada" }]])

const findUser = (id: string): IOType<never, AppError, User> => {
  if (id === "boom") return IO.die(new Error("database on fire"))
  if (id === "secret") return IO.fail({ _tag: "Forbidden" })
  if (id === "bad") return IO.fail({ _tag: "Invalid", reason: "not a number" })
  const user = users.get(id)
  return user === undefined ? IO.fail({ _tag: "NotFound", id }) : IO.succeed(user)
}

/** One mapper for every route's errors, each status with its own body. */
const failure = (c: Context, e: AppError) => {
  switch (e._tag) {
    case "NotFound":
      return c.json({ error: "not found", id: e.id }, 404)
    case "Forbidden":
      return c.json({ error: "forbidden" }, 403)
    case "Invalid":
      return c.json({ error: "invalid", reason: e.reason }, 422)
  }
}

const app = new Hono()
  .get(
    "/users/:id",
    validator("query", (value) => ({ verbose: value["verbose"] === "1" })),
    (c) =>
      respond(findUser(c.req.param("id")), {
        ok: (user) => c.json({ ...user, verbose: c.req.valid("query").verbose }, 200),
        err: (e) => failure(c, e),
      }),
  )
  .delete("/users/:id", (c) =>
    respond(findUser(c.req.param("id")), {
      ok: () => c.body(null, 204),
      err: (e) => failure(c, e),
    }),
  )
  .get("/slow", (c) =>
    respond(
      IO.sleep(5_000).map(() => "late"),
      { ok: (text) => c.text(text, 200), err: () => c.text("never", 500) },
      { signal: c.req.raw.signal },
    ),
  )
  .get("/bytes", (c) =>
    respond(IO.succeed(new Uint8Array([104, 105])), {
      ok: (bytes) => c.body(bytes, 200),
      err: () => c.text("never", 500),
    }),
  )
  .post("/created", (c) =>
    respond(IO.succeed(undefined), { ok: () => c.body(null, 201), err: () => c.text("never", 500) }),
  )
  .get("/cached", (c) =>
    respond(IO.succeed('{"a":1}'), {
      ok: (json) => c.body(json, 200, { "content-type": "application/json" }),
      err: () => c.text("never", 500),
    }),
  )
  .get("/problem", () => new Response('{"title":"x"}', { headers: { "content-type": "application/problem+json" } }))
  .get("/ndjson", () => new Response('{"a":1}\n{"a":2}\n', { headers: { "content-type": "application/x-ndjson" } }))
  .get("/maybe-away", (c) =>
    respond(IO.succeed(c.req.query("away") === "1"), {
      ok: (away) => (away ? c.redirect("/hello", 302) : c.json({ u: 1 }, 200)),
      err: () => c.text("never", 500),
    }),
  )
  .get("/away", (c) =>
    respond(IO.succeed(undefined), { ok: () => c.redirect("/hello", 302), err: () => c.text("never", 500) }),
  )
  .get("/plain", () => new Response('{"a":1}', { headers: { "content-type": "application/json" } }))
  .get("/hello", (c) =>
    respond(IO.succeed("hello"), { ok: (text) => c.text(text, 200), err: () => c.text("never", 500) }),
  )

app.onError((error, c) => c.json({ error: "internal", message: error.message }, 500))

const client = hc<typeof app>("http://localhost", {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => app.request(input, init),
})

describe("respond: types the RPC client sees", () => {
  it("keeps each status's body", () => {
    type Get = (typeof client.users)[":id"]["$get"]
    expectTypeOf<InferResponseType<Get, 200>>().toEqualTypeOf<{ id: string; name: string; verbose: boolean }>()
    expectTypeOf<InferResponseType<Get, 404>>().toEqualTypeOf<{ error: string; id: string }>()
    expectTypeOf<InferResponseType<Get, 403>>().toEqualTypeOf<{ error: string }>()
    expectTypeOf<InferResponseType<Get, 422>>().toEqualTypeOf<{ error: string; reason: string }>()
  })
})

/** A typed response made outside a handler. */
const typed = (text: string) => new Hono().get("/", (c) => c.text(text, 200)).request("/") as never

describe("respond", () => {
  it("doesn't accept a plain Response, which would erase the client's types", () => {
    void (() =>
      respond(IO.succeed(1), {
        // @ts-expect-error a plain Response isn't a typed Hono response
        ok: () => new Response("x"),
        err: () => typed("never"),
      }))
  })

  it("responds with ok on a success", async () => {
    const res = await app.request("/users/1")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: "1", name: "Ada", verbose: false })
  })

  it("responds with err on a typed failure", async () => {
    const res = await app.request("/users/2")
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: "not found", id: "2" })
  })

  it("hands a defect to app.onError as the original error", async () => {
    const res = await app.request("/users/boom")
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "internal", message: "database on fire" })
  })

  it("throws an InterruptedError when the signal aborts", async () => {
    const controller = new AbortController()
    const pending = respond(
      IO.sleep(5_000).map(() => "late"),
      { ok: () => typed("late"), err: () => typed("never") },
      { signal: controller.signal },
    )
    controller.abort()
    await expect(pending).rejects.toBeInstanceOf(InterruptedError)
  })
})

describe("call", () => {
  it("gives the typed body of a 2xx response", async () => {
    const io = call((signal) =>
      client.users[":id"].$get({ param: { id: "1" }, query: { verbose: "0" } }, { init: { signal } }),
    )
    expectTypeOf(io).toEqualTypeOf<IOType<never, CallError, { id: string; name: string; verbose: boolean }>>()
    expect((await io.run()).orThrow()).toEqual({ id: "1", name: "Ada", verbose: false })
  })

  it("gives null for a 204", async () => {
    const io = call(() => client.users[":id"].$delete({ param: { id: "1" } }))
    expectTypeOf(io).toEqualTypeOf<IOType<never, CallError, null>>()
    expect((await io.run()).orThrow()).toBe(null)
  })

  it("reads a text body as text", async () => {
    const io = call(() => client.hello.$get())
    expectTypeOf(io).toEqualTypeOf<IOType<never, CallError, string>>()
    expect((await io.run()).orThrow()).toBe("hello")
  })

  it("types a c.body route's body as unknown, since its content type is up to the route", async () => {
    const io = call(() => client.bytes.$get())
    expectTypeOf(io).toEqualTypeOf<IOType<never, CallError, unknown>>()
    expect((await io.run()).orThrow()).toBe("hi")
  })

  it("types a null body with another 2xx as empty text, as it arrives", async () => {
    const io = call(() => client.created.$post())
    expectTypeOf(io).toEqualTypeOf<IOType<never, CallError, "">>()
    expect((await io.run()).orThrow()).toBe("")
  })

  it("reads a c.body route with a JSON content type as JSON, typed unknown", async () => {
    const io = call(() => client.cached.$get())
    expectTypeOf(io).toEqualTypeOf<IOType<never, CallError, unknown>>()
    expect((await io.run()).orThrow()).toEqual({ a: 1 })
  })

  it("parses a +json content type, and reads ndjson as text", async () => {
    expect((await call(() => client.problem.$get()).run()).orThrow()).toEqual({ title: "x" })
    expect((await call(() => client.ndjson.$get()).run()).orThrow()).toBe('{"a":1}\n{"a":2}\n')
  })

  it("types a route with a redirect as unknown, alone or beside JSON", () => {
    expectTypeOf(call(() => client["maybe-away"].$get())).toEqualTypeOf<IOType<never, CallError, unknown>>()
    expectTypeOf(call(() => client.away.$get())).toEqualTypeOf<IOType<never, CallError, unknown>>()
  })

  it("types a response whose status is only a number as unknown", () => {
    type Loose = ClientResponse<{ readonly a: number }, number, "json">
    expectTypeOf<SuccessBody<Loose>>().toEqualTypeOf<unknown>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- an untyped client
    expectTypeOf<SuccessBody<any>>().toEqualTypeOf<unknown>()
  })

  it("types a route Hono can't type as unknown, and reads it by content type", async () => {
    const io = call(() => client.plain.$get())
    expectTypeOf(io).toEqualTypeOf<IOType<never, CallError, unknown>>()
    expect((await io.run()).orThrow()).toEqual({ a: 1 })
  })

  it("gives null for a 205, and an HttpError with a null body for a 304", async () => {
    const status = (code: number) =>
      hc<typeof app>("http://localhost", { fetch: () => Promise.resolve(new Response(null, { status: code })) })
    expect((await call(() => status(205).users[":id"].$delete({ param: { id: "1" } })).run()).orThrow()).toBe(null)
    const notModified = await call(() => status(304).users[":id"].$delete({ param: { id: "1" } })).run()
    expect(notModified.isLeft() && notModified.value).toEqual({ _tag: "HttpError", status: 304, body: null })
  })

  it("fails with InvalidBody for a JSON content type with an empty body", async () => {
    const empty = hc<typeof app>("http://localhost", {
      fetch: () => Promise.resolve(new Response("", { status: 200, headers: { "content-type": "application/json" } })),
    })
    const result = await call(() => empty.users[":id"].$get({ param: { id: "1" }, query: { verbose: "0" } })).run()
    expect(result.isLeft() && result.value._tag).toBe("InvalidBody")
  })

  it("fails with HttpError and the parsed body on a non-2xx status", async () => {
    const result = await call(() =>
      client.users[":id"].$get({ param: { id: "secret" }, query: { verbose: "0" } }),
    ).run()
    expect(result.isLeft() && result.value).toEqual({ _tag: "HttpError", status: 403, body: { error: "forbidden" } })
  })

  it("maps the error with toError", async () => {
    const io = call(
      () => client.users[":id"].$get({ param: { id: "2" }, query: { verbose: "0" } }),
      (e) => (e._tag === "HttpError" && e.status === 404 ? ("missing" as const) : ("other" as const)),
    )
    expectTypeOf(io).toEqualTypeOf<IOType<never, "missing" | "other", { id: string; name: string; verbose: boolean }>>()
    const result = await io.run()
    expect(result.isLeft() && result.value).toBe("missing")
  })

  it("fails with Unreachable when the request throws", async () => {
    const broken = hc<typeof app>("http://localhost", {
      fetch: () => Promise.reject(new TypeError("fetch failed")),
    })
    const result = await call(() => broken.hello.$get()).run()
    expect(result.isLeft() && result.value._tag).toBe("Unreachable")
  })

  it("fails with InvalidBody when a 2xx body isn't the JSON it claims", async () => {
    const lying = hc<typeof app>("http://localhost", {
      fetch: () =>
        Promise.resolve(new Response("{not json", { status: 200, headers: { "content-type": "application/json" } })),
    })
    const result = await call(() => lying.users[":id"].$get({ param: { id: "1" }, query: { verbose: "0" } })).run()
    expect(result.isLeft() && result.value._tag).toBe("InvalidBody")
  })

  it("ends interrupted when the run is cancelled, and aborts the fetch", async () => {
    const seen: AbortSignal[] = []
    const hanging = hc<typeof app>("http://localhost", {
      fetch: (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal
          if (signal) {
            seen.push(signal)
            signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
          }
        }),
    })
    const controller = new AbortController()
    const running = call((signal) => hanging.hello.$get(undefined, { init: { signal } })).runExit({
      signal: controller.signal,
    })
    await new Promise((resolve) => setTimeout(resolve, 10))
    controller.abort()
    expect((await running).isInterrupted()).toBe(true)
    expect(seen[0]?.aborted).toBe(true)
  })
})
