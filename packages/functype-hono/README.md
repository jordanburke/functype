# functype-hono

[Hono](https://hono.dev) for [functype](https://functype.org), on both sides of the wire:

- **`respond`** turns an `IO` into a Hono response. A success and each typed failure get their own typed response, so Hono's RPC client still sees every status's body.
- **`call`** (from `functype-hono/client`) runs a Hono RPC client call as an `IO`. A 2xx gives its typed body, and anything else a typed error rather than a rejection.

```bash
pnpm add functype-hono functype hono
```

## Server: `respond`

Build the route's work as one IO, then respond once. `ok` gets the success value and `err` the typed failure; each returns a Hono response:

```ts
import { IO } from "functype"
import { respond } from "functype-hono"
import type { Context } from "hono"
import { Hono } from "hono"

type User = { readonly id: string; readonly name: string }
type AppError = { readonly _tag: "NotFound"; readonly id: string } | { readonly _tag: "Forbidden" }

declare const findUser: (id: string) => IO<never, AppError, User>
declare const checkAccess: (user: User) => IO<never, AppError, User>

// One mapper for every route's errors, each status with its own body.
const failure = (c: Context, e: AppError) => {
  switch (e._tag) {
    case "NotFound":
      return c.json({ error: "not found", id: e.id }, 404)
    case "Forbidden":
      return c.json({ error: "forbidden" }, 403)
  }
}

export const app = new Hono().get("/users/:id", (c) =>
  respond(findUser(c.req.param("id")).flatMap(checkAccess), {
    ok: (user) => c.json(user, 200),
    err: (e) => failure(c, e),
  }),
)
```

- **Several steps, one response.** Compose them with `flatMap` or `IO.gen` before `respond`. A failure at any step goes to `err`, so a route needs no early returns.
- **The client keeps every status.** The handler returns the union of what `ok` and `err` return. Hono's client then types each status's body: 200 gives `User`, 404 gives `{ error: string; id: string }`, 403 gives `{ error: string }`.
- **Responses must be typed.** `ok` and `err` must return Hono's typed responses: `c.json`, `c.text`, `c.body` or `c.redirect`. A plain `new Response(…)` would erase the types the client sees, so it doesn't compile. Nor do `c.html(…)` and `c.notFound()`, which return a plain `Response` in Hono; for a not-found, return `c.json({ error: "not found" }, 404)`.
- **Defects go to `app.onError`.** A defect is rethrown as the original error, as a throw in a handler would be. Hono routes only `Error` instances to `app.onError`, so an `IO.die` with another value doesn't reach it, as a bare `throw "x"` wouldn't.
- **Services come first.** `respond` takes an IO that needs nothing, so provide its services before it: `respond(program.provideService(Db.tag, db), …)`.
- **Cancelling is opt-in.** Pass `{ signal: c.req.raw.signal }` as a third argument to cancel the IO when the request's signal aborts. A cancel then throws an `InterruptedError`. Whether that signal aborts when a client disconnects depends on the runtime adapter, so it isn't the default.

## Client: `call`

```ts
import { call } from "functype-hono/client"
import { hc } from "hono/client"

const client = hc<typeof app>("https://api.example.com")

const user = (id: string) => call((signal) => client.users[":id"].$get({ param: { id } }, { init: { signal } }))
// IO<never, CallError, User>
```

- **A 2xx response** gives its body, typed from the route.
  - JSON is parsed when the content type is `application/json` or a `+json` type such as `application/problem+json`, and other bodies are read as text. For a binary download, call the client directly.
  - `c.json` and `c.text` routes are typed as they send. The types assume the route keeps the content type those set; a route that overrides it with a header gets what its header says.
  - A 204 or 205 gives `null`. A `c.body(null, …)` with another 2xx status gives `""`.
  - Any other body is `unknown`, because its content type is up to the route: a non-null `c.body(…)`, a plain `Response`, or a proxied `fetch`. Check it before you use it. A handler that mixes `c.json` with one of those, or with `c.notFound()` or `c.html(…)`, makes the whole route `unknown`, because Hono can't type that leg.
  - A JSON content type with an empty body is an `InvalidBody`.
  - A route with a redirect, alone or beside other responses, gives `unknown`: `fetch` follows redirects by default, so the body is the target's.
  - A route with no 2xx status and no redirect gives `IO<never, CallError, never>`.
- **Any other outcome** is a `CallError`:
  ```ts
  type CallError =
    | { readonly _tag: "Unreachable"; readonly cause: unknown } // no response: a network error
    | { readonly _tag: "HttpError"; readonly status: number; readonly body: unknown } // a non-2xx status
    | { readonly _tag: "InvalidBody"; readonly status: number; readonly cause: unknown } // a 2xx body that didn't parse
  ```
  A 304 isn't 2xx, so it's an `HttpError` with a `null` body. The `body` of an `HttpError` is `unknown`, because a status can come from anywhere on the way, such as a proxy or `app.onError`. Check it before you use it.
- **Your own error type:** map to it with a second argument, `call(request, (e) => toApiError(e))`. If that function throws, the run dies rather than failing with a typed error.
- **Cancelling.** `request` gets the run's abort signal; pass it as `init.signal`. A cancelled run then aborts the fetch and ends interrupted, not as a `CallError`.

`functype-hono/client` imports no server code, so it is safe to ship to browsers.

## License

MIT
