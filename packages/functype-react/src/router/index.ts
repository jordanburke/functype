/**
 * `functype-react/router` — TanStack Router helpers for functype.
 *
 * - `exitRoute` ends `beforeLoad` or `loader` from an `Either`, so a guard returns a value
 *   instead of throwing `redirect()` or `notFound()` itself.
 * - `searchParams` and `SearchParam` build a typed `validateSearch` from one `Option` parser per key.
 *
 * Requires `@tanstack/react-router`, an optional peer dependency.
 */
export type { RouteExit } from "./guard"
export { exitRoute } from "./guard"
export type { SearchField, SearchOf } from "./search"
export { SearchParam, searchParams } from "./search"
