import type { Option as OptionType } from "functype"
import { Option } from "functype"

/** Reads one search param: `Some` for a value it accepts, `None` for anything else. */
export type SearchField<T> = (raw: unknown) => OptionType<T>

/**
 * The validated search object: each field's value, or `undefined` when its parser gave `None`.
 *
 * @interop TanStack Router merges validateSearch's result over the raw search and drops undefined keys from URLs, so a rejected key must be undefined, not absent.
 */
export type SearchOf<F> = { readonly [K in keyof F]?: (F[K] extends SearchField<infer T> ? T : never) | undefined }

const text = (raw: unknown): OptionType<string> => {
  if (typeof raw === "string") return raw.length > 0 ? Option(raw) : Option.none()
  // TanStack Router parses `?q=123` as the number 123, so a hand-typed number is still text.
  return typeof raw === "number" && Number.isFinite(raw) ? Option(String(raw)) : Option.none()
}

const numeric = (raw: unknown): OptionType<number> => {
  if (typeof raw === "number") return Number.isFinite(raw) ? Option(raw) : Option.none()
  if (typeof raw !== "string" || raw.trim().length === 0) return Option.none()
  const n = Number(raw)
  return Number.isFinite(n) ? Option(n) : Option.none()
}

/**
 * Parsers for {@link searchParams}. Each takes what TanStack Router's search parsing gives for one
 * key, which is JSON where the value parses as JSON (`?page=2` is the number 2, `?on=true` is
 * `true`) and the raw string otherwise.
 */
export const SearchParam = {
  /** A non-empty string. A number, as `?q=123` parses, becomes its text. An empty value is left out. */
  string: text satisfies SearchField<string>,
  /** A finite number, or a string that reads as one. */
  number: numeric satisfies SearchField<number>,
  /** A whole number, or a string that reads as one. */
  integer: ((raw: unknown) => numeric(raw).filter(Number.isInteger)) satisfies SearchField<number>,
  /** `true` or `false`, or the strings `"true"` and `"false"`. */
  boolean: ((raw: unknown): OptionType<boolean> => {
    if (typeof raw === "boolean") return Option(raw)
    if (raw === "true") return Option(true)
    return raw === "false" ? Option(false) : Option.none()
  }) satisfies SearchField<boolean>,
  /** One of the given strings. Anything else is left out. */
  oneOf:
    <const V extends readonly [string, ...string[]]>(...values: V): SearchField<V[number]> =>
    (raw) =>
      text(raw).filter((value): value is V[number] => values.includes(value)),
} as const

/**
 * Builds a `validateSearch` from one parser per key. A parser's `None` sets its key to `undefined`.
 * TanStack Router merges this result over the raw search, so an absent key would keep its raw,
 * unvalidated value; `undefined` replaces it, and TanStack leaves `undefined` keys out of URLs. The
 * result is also the type `navigate`'s `search` takes. Keys no parser names still pass through at
 * runtime, as TanStack keeps them, but aren't in the type.
 *
 * ```ts
 * const listSearch = searchParams({
 *   q: SearchParam.string,
 *   page: SearchParam.integer,
 *   sort: SearchParam.oneOf("new", "old"),
 * })
 *
 * const list = createRoute({ getParentRoute: () => root, path: "/list", validateSearch: listSearch })
 * // useSearch: { readonly q?: string | undefined; readonly page?: number | undefined; readonly sort?: "new" | "old" | undefined }
 * ```
 */
export const searchParams =
  <F extends Readonly<Record<string, SearchField<unknown>>>>(fields: F) =>
  (search: Readonly<Record<string, unknown>>): SearchOf<F> =>
    Object.fromEntries(
      Object.entries(fields).map(([key, parse]) => [key, parse(search[key]).orUndefined()]),
    ) as SearchOf<F>
