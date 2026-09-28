/**
 * A value in its serialization-safe shape — a DB row, an HTTP body, a JSONB payload, a workflow
 * input. Wraps ANY boundary shape: a collection (`Wire<ReadonlyArray<Row>>`), a nullable field
 * (`Wire<string | null>`), or a whole row/DTO type (`Wire<Row>`), which covers every field inside it.
 *
 * `null` is the shape that survives `JSON.stringify`; `Option` and `List` are not. Inside the code that
 * transforms these values, convert with `Option(x)` / `List(xs)`.
 *
 * Zero runtime, zero type-level enforcement: this is the "flavoring" pattern (optional phantom symbol)
 * rather than a required brand, so `Wire<T>` and `T` are bidirectionally assignable and call sites need
 * no casts. `null` and `undefined` are passed through unbranded — an intersection brand on them would
 * collapse to `never`.
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
 * Caveat: a bare type parameter cannot satisfy the conditional brand, so `<T>(x: T): Wire<T> => x`
 * does not compile. Wire concrete row and field types, not generic plumbing.
 *
 * Migration from 1.9: `Wire<Row>` meant `ReadonlyArray<Row>`; write `Wire<ReadonlyArray<Row>>`.
 *
 * @category Wire
 */
declare const WIRE: unique symbol

export type Wire<T> = T extends null | undefined ? T : T & { readonly [WIRE]?: never }
