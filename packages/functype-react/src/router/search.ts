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
  // TanStack Router parses `?q=123` as the number 123 and `?q=true` as true, so a hand-typed
  // number or boolean is still text.
  if (typeof raw === "number") return Number.isFinite(raw) ? Option(String(raw)) : Option.none()
  return typeof raw === "boolean" ? Option(String(raw)) : Option.none()
}

/**
 * A decimal number as text: digits, an optional fraction and exponent. No hex, no blanks. Each digit
 * run has one way to match, so a long input from a crafted URL is checked in linear time.
 */
const DECIMAL = /^-?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/

const numeric = (raw: unknown): OptionType<number> => {
  if (typeof raw === "number") return Number.isFinite(raw) ? Option(raw) : Option.none()
  if (typeof raw !== "string" || !DECIMAL.test(raw)) return Option.none()
  const n = Number(raw)
  return Number.isFinite(n) ? Option(n) : Option.none()
}

/**
 * Parsers for {@link searchParams}. Each takes what TanStack Router's search parsing gives for one
 * key, which is JSON where the value parses as JSON (`?page=2` is the number 2, `?on=true` is
 * `true`) and the raw string otherwise.
 */
export const SearchParam = {
  /**
   * A non-empty string. A number or boolean, as `?q=123` and `?q=true` parse, becomes its text; an
   * empty value or `null` is rejected.
   */
  string: text satisfies SearchField<string>,
  /** A finite number, or a decimal string that reads as one (not hex). */
  number: numeric satisfies SearchField<number>,
  /** A whole number, or a decimal string that reads as one. */
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
 * A `validateSearch` in TanStack Router's validator-object form. It is an object with `parse`, not a
 * function, because TanStack loses a function validator's type when it is written inline beside a
 * `beforeLoad` or `loaderDeps` that reads `search`.
 */
export type SearchValidator<F> = {
  readonly parse: (search: Readonly<Record<string, unknown>>) => SearchOf<F>
}

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
export const searchParams = <F extends Readonly<Record<string, SearchField<unknown>>>>(
  fields: F,
): SearchValidator<F> => ({
  parse: (search) =>
    Object.fromEntries(
      Object.entries(fields).map(([key, parse]) => [key, parse(search[key]).orUndefined()]),
    ) as SearchOf<F>,
})
