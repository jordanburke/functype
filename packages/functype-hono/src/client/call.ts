import type { IOType } from "functype"
import { IO } from "functype"
import type { ClientResponse } from "hono/client"
import type { SuccessStatusCode } from "hono/utils/http-status"

/**
 * Why a {@link call} failed.
 *
 * - `Unreachable`: the request never got a response, such as a network error.
 * - `HttpError`: the response's status wasn't 2xx. `body` is the parsed JSON, or the text when the
 *   response isn't JSON, or `undefined` when it couldn't be read. Its type is `unknown` because a
 *   status can come from anywhere on the way, such as a proxy or `app.onError`.
 * - `InvalidBody`: a 2xx response whose body couldn't be read as its content type says.
 */
export type CallError =
  | { readonly _tag: "Unreachable"; readonly cause: unknown }
  | { readonly _tag: "HttpError"; readonly status: number; readonly body: unknown }
  | { readonly _tag: "InvalidBody"; readonly status: number; readonly cause: unknown }

/**
 * What {@link call} gives for a body of type `T` sent in format `F`. `call` reads a body by its
 * content type at runtime, so only formats whose content type Hono sets are typed:
 *
 * - `c.json` and `c.text` arrive as typed, assuming the route keeps their content type.
 * - A `c.body(null, …)` gives `null` for a 204 or 205 and `""` otherwise.
 * - Any other body, such as a non-null `c.body(…)`, a plain `Response` or a proxied `fetch`, gives
 *   `unknown`: its content type is up to the route, so check it before you use it.
 *
 * @interop These are the bodies a Hono route sends over the wire, null included, as its client types them.
 */
type ReadBody<T, F, S> = string extends F
  ? unknown
  : F extends "json" | "text"
    ? T
    : T extends null
      ? S extends 204 | 205
        ? null
        : ""
      : unknown

/** The 2xx body of one response type: `unknown` when its status is only known to be a number. */
type Body2xx<R> =
  R extends ClientResponse<infer T, infer S, infer F>
    ? number extends S
      ? unknown
      : S extends SuccessStatusCode
        ? ReadBody<T, F, S>
        : never
    : never

/** True when some response of the route is a redirect. */
type HasRedirect<R> = true extends (
  R extends ClientResponse<unknown, number, infer F> ? (F extends "redirect" ? true : false) : false
)
  ? true
  : false

/**
 * The body type of a Hono client response's 2xx statuses, as {@link call} reads it.
 *
 * A route with a redirect gives `unknown`: `fetch` follows redirects, so the body is the target's.
 * So does an untyped client (`any`).
 */
export type SuccessBody<R> = 0 extends 1 & R ? unknown : HasRedirect<R> extends true ? unknown : Body2xx<R>

const CONTENTLESS: ReadonlySet<number> = new Set([204, 205, 304])

/** `application/json`, or a `+json` type such as `application/problem+json`. */
const isJson = (response: Response): boolean => {
  const type = (response.headers.get("content-type") ?? "").toLowerCase().split(";")[0]?.trim() ?? ""
  return type === "application/json" || type.endsWith("+json")
}

const readBody = (response: Response): Promise<unknown> => {
  if (CONTENTLESS.has(response.status)) return Promise.resolve(null)
  return isJson(response) ? response.json() : response.text()
}

const failure = (response: Response): IOType<never, CallError, never> =>
  IO.tryAsync(
    () => readBody(response),
    (): unknown => undefined,
  )
    .recover(undefined)
    .flatMap((body) => IO.fail<CallError>({ _tag: "HttpError", status: response.status, body }))

const success = <A>(response: Response): IOType<never, CallError, A> =>
  IO.tryAsync(
    () => readBody(response) as Promise<A>,
    (cause): CallError => ({ _tag: "InvalidBody", status: response.status, cause }),
  )

/**
 * Runs a Hono RPC client call as an IO: a 2xx response gives its typed body, and anything else a
 * {@link CallError}, or your own error through `toError`. A failed request is a typed error, not
 * a rejection; only a throw from `toError` itself, or a `request` that doesn't resolve to a
 * `Response`, is a defect.
 *
 * `request` gets the run's abort signal; pass it as `init.signal` so a cancelled run aborts the
 * fetch. A cancelled call ends interrupted, not as a `CallError`.
 *
 * The body is read as JSON when the content type is `application/json` or a `+json` type, as
 * text otherwise, and as `null` for 204 and 205. A binary body arrives as text, so call the client
 * directly for a download. A 304 isn't 2xx, so it is an `HttpError` with a `null` body. `fetch` follows
 * redirects, so a redirect route gives the target's body.
 *
 * @example
 * ```ts
 * const user = (id: string) =>
 *   call((signal) => client.users[":id"].$get({ param: { id } }, { init: { signal } }))
 * // IO<never, CallError, User>
 * ```
 */
export const call: {
  <R extends ClientResponse<unknown, number, string>>(
    request: (signal?: AbortSignal) => Promise<R>,
  ): IOType<never, CallError, SuccessBody<R>>
  <R extends ClientResponse<unknown, number, string>, E>(
    request: (signal?: AbortSignal) => Promise<R>,
    toError: (error: CallError) => E,
  ): IOType<never, E, SuccessBody<R>>
} = <R extends ClientResponse<unknown, number, string>, E>(
  request: (signal?: AbortSignal) => Promise<R>,
  toError?: (error: CallError) => E,
): IOType<never, CallError | E, SuccessBody<R>> => {
  const io = IO.tryAsync(
    async (signal) => (await request(signal)) as unknown as Response,
    (cause): CallError => ({ _tag: "Unreachable", cause }),
  ).flatMap((response) => (response.ok ? success<SuccessBody<R>>(response) : failure(response)))
  return toError === undefined ? io : io.mapError(toError)
}
