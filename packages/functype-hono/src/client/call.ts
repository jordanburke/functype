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

/** The body type of a Hono client response's 2xx statuses. */
export type SuccessBody<R> =
  R extends ClientResponse<infer T, infer S, infer _F> ? (S extends SuccessStatusCode ? T : never) : never

const CONTENTLESS: ReadonlySet<number> = new Set([204, 205, 304])

const isJson = (response: Response): boolean =>
  (response.headers.get("content-type") ?? "").toLowerCase().includes("json")

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
 * {@link CallError}, or your own error through `toError`. It never throws.
 *
 * `request` gets the run's abort signal; pass it as `init.signal` so a cancelled run aborts the
 * fetch. A cancelled call ends interrupted, not as a `CallError`.
 *
 * The body is read as JSON when the response says so, as text otherwise, and as `null` for 204,
 * 205 and 304.
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
