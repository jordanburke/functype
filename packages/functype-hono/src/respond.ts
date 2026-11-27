import type { IOType } from "functype"
import { InterruptedError } from "functype"
import type { TypedResponse } from "hono"
import type { StatusCode } from "hono/utils/http-status"

/**
 * A response Hono's RPC client can read the type of: what `c.json`, `c.text`, `c.body` and
 * `c.redirect` return. A plain `Response` in a handler's return type erases the types the client
 * sees, so {@link respond} doesn't accept one.
 */
export type HonoResponse = Response & TypedResponse<unknown, StatusCode, string>

/** What {@link respond} turns each outcome of the IO into. */
export type RespondHandlers<E, A, ROk extends HonoResponse, RErr extends HonoResponse> = {
  /** The response for a success, such as `(user) => c.json(user, 200)`. */
  readonly ok: (value: A) => ROk | Promise<ROk>
  /** The response for a typed failure, such as `(e) => c.json({ error: e._tag }, 404)`. */
  readonly err: (error: E) => RErr | Promise<RErr>
}

/** Options for {@link respond}. */
export type RespondOptions = {
  /**
   * Cancels the IO when it aborts, such as `c.req.raw.signal`. Whether that signal aborts when the
   * client disconnects depends on the runtime adapter, so it is opt-in.
   */
  readonly signal?: AbortSignal
}

/**
 * Runs an IO and turns its outcome into a Hono response.
 *
 * - A success goes to `ok`, and a typed failure to `err`.
 * - A defect is rethrown as the original error, so `app.onError` handles it, as it would a throw in
 *   the handler.
 * - A cancel through `options.signal` throws an `InterruptedError`.
 *
 * The handler's return type is the union of what `ok` and `err` return, so Hono's RPC client still
 * sees each status's body. Both must return Hono's typed responses, such as `c.json(body, status)`:
 * a plain `Response` in the union would erase the types the client sees, so it doesn't compile.
 *
 * Provide the IO's services first, and compose several steps with `flatMap` or `IO.gen` before
 * responding once.
 *
 * @example
 * ```ts
 * app.get("/users/:id", (c) =>
 *   respond(findUser(c.req.param("id")).provideService(Db.tag, db), {
 *     ok: (user) => c.json(user, 200),
 *     err: (e) => c.json({ error: e._tag }, 404),
 *   }),
 * )
 * ```
 */
export const respond = async <E, A, ROk extends HonoResponse, RErr extends HonoResponse>(
  io: IOType<never, E, A>,
  handlers: RespondHandlers<E, A, ROk, RErr>,
  options: RespondOptions = {},
): Promise<ROk | RErr> => {
  const exit = await io.runExit(options.signal === undefined ? undefined : { signal: options.signal })
  return exit.fold<Promise<ROk | RErr>>(
    async (error) => handlers.err(error),
    async (value) => handlers.ok(value),
    () => Promise.reject(new InterruptedError()),
    (defect) => Promise.reject(defect),
  )
}
