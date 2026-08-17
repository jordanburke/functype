/**
 * A collection crossing a serialization boundary — DB rows, HTTP bodies, JSONB
 * payloads, workflow inputs. Structurally identical to `ReadonlyArray<T>`, so
 * there is no friction at call sites and no runtime cost. Convert with
 * `List(...)` before transforming.
 *
 * Zero type-level enforcement: this is the "flavoring" pattern (optional
 * phantom symbol) rather than a required brand — `Wire<T>` and
 * `ReadonlyArray<T>` are bidirectionally assignable. Value lives in three
 * places: `rg 'Wire<'` gives a countable boundary inventory, the name
 * documents intent at the declaration site, and the `prefer-list` ESLint rule
 * ignores `Wire<T>` for free (it inspects `TSTypeReference.typeName` and only
 * recognizes `Array` / `ReadonlyArray`).
 *
 * Intended pairing: set `functype/prefer-list` to `allowReadonlyArrays: false`
 * and use `Wire<T>` as the sole explicit escape hatch at serialization
 * boundaries. Consumer aliases (`type ClaimedDoc = Wire<Row>`) compose
 * cleanly — usages of the alias pass the linter for the same syntactic
 * reason, and only the alias declaration needs updating when the boundary
 * shape changes.
 *
 * @category Wire
 */
declare const WIRE: unique symbol

export type Wire<T> = ReadonlyArray<T> & { readonly [WIRE]?: never }
