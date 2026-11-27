import type { AnyRedirect, NotFoundError } from "@tanstack/react-router"
import type { Either } from "functype"

/** What ends a route early: a `redirect(…)` or a `notFound(…)` from TanStack Router. */
export type RouteExit = AnyRedirect | NotFoundError

/**
 * Ends `beforeLoad` or `loader` from an `Either`: a `Left` redirect or not-found is thrown the way
 * TanStack Router expects, and a `Right` is returned, so in `beforeLoad` it becomes route context.
 *
 * @interop TanStack Router redirects or shows Not Found from beforeLoad or loader only when it throws redirect() or notFound().
 */
export const exitRoute = <A>(result: Either<RouteExit, A>): A =>
  result.fold(
    (exit) => {
      throw exit
    },
    (value) => value,
  )
