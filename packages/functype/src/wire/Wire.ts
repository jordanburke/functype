/**
 * A value in its serialization-safe shape — a DB row, an HTTP body, a JSONB payload, a workflow
 * input. Wraps ANY boundary shape: a collection (`Wire<ReadonlyArray<Row>>`), a nullable field
 * (`Wire<string | null>`), or a whole row/DTO type (`Wire<Row>`), which covers every field inside it.
 *
 * `null` is the shape that survives `JSON.stringify`; `Option` and `List` are not. Inside the code that
 * transforms these values, convert with `Option(x)` / `List(xs)`.
 *
 * Zero runtime, zero type-level enforcement. `Wire<T>` is `T | (T & WireMark)`: the plain `T` member
 * keeps it assignable both ways with `T` — including `null`, `undefined` and `unknown` — so call sites
 * need no casts, and generic helpers like `findOne<R>(): Promise<Wire<R | null>>` compile. The branded
 * member exists so TypeScript keeps the alias name instead of resolving it eagerly: inferred exports
 * emit `Wire<Row>` in `.d.ts` files and hovers, rather than a type that names an unexported symbol
 * (which fails a consumer's declaration build with TS4023).
 *
 * Value lives in three places:
 * - `rg 'Wire<'` is the countable inventory of serialization boundaries;
 * - the name documents intent at the declaration site;
 * - `functype/prefer-list` and `functype/prefer-option` skip everything inside a `Wire<…>` type
 *   argument (`wireTypes` option, default `["Wire"]`), so the boundary is declared once instead of
 *   suppressed at every field.
 *
 * Consumer aliases compose: `type UserRow = Wire<{ … }>` — uses of `UserRow` pass the linter, and the
 * alias declaration is the one place the boundary is stated.
 *
 * Migration from 1.9: `Wire<Row>` meant `ReadonlyArray<Row>`; write `Wire<ReadonlyArray<Row>>`. The
 * change is compile-loud except for `Wire<object>` and `Wire<any>`, which accept an array either way.
 *
 * @category Wire
 */
declare const WIRE: unique symbol

/**
 * The phantom mark that keeps `Wire<T>` a named alias through inference and declaration emit.
 * Exported so emitted declarations can name it; never needed in user code.
 */
export interface WireMark {
  readonly [WIRE]?: never
}

export type Wire<T> = T | (T & WireMark)
