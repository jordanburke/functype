# HTTP wire-format: Decoder/Encoder interface + remove `validate` (2.0.0)

> **Scope note (updated):** The request-side wire-flatten work that originally lived in this proposal already shipped in **1.3.0** as a non-breaking default change (`HttpRequestOptions.flatten?: boolean` default `true`, plus a `normalizeBody` walker). 1.3 was a defensible vehicle for that work because the new default is opt-out-able (`flatten: false` preserves the prior tagged emission). What remains for 2.0 is the truly-breaking surface: removing the deprecated `validate` field in favor of `Decoder<T>` / `decodeUnsafe`, plus the matching minimum `Encoder<A>` type alias.

## Context

The `functype/fetch` HTTP client today decodes responses via a `validate: (data: unknown) => T` field — throw-or-pass, no named contract for adapter packages (Zod / ArkType / TypeBox / Valibot) to target, no shared error shape. Every user invents their own error tree.

The 1.3 release adds `decode?: Decoder<T>` alongside `validate` (Either-returning, recursive `DecoderError`) — but keeps `validate` for back-compat. 2.0 is the version where `validate` goes away and `decode` becomes the only path. That's the breaking change that warrants the major bump.

Intended outcome for 2.0:
- Remove the deprecated `validate` field. `decode: Decoder<T>` (Either-returning, default) and `decodeUnsafe?: (raw) => T` (throw-or-pass escape hatch for Zod's `.parse` and inline lambdas) replace it.
- Ship a minimum encode side: `type Encoder<A> = (value: A) => JSONValue` (one-line alias) + `encode?: Encoder<TReq>` per-call hook on `HttpRequestOptions`. Closes the symmetry gap and gives a clean escape hatch for custom Date formats, camelCase↔snake_case, output validation, field-stripping — anything the existing `flatten: true|false` can't express. **Do NOT ship the combinator suite** (`Encoder.object`, `Encoder.option`, etc.) or full bidirectional `Codec<A>`; grow those in 2.1+ only if real usage drives them.

The `Decoder<T>` type itself, its `DecoderError` recursive ADT, the `Decoder.object` / `Decoder.option` / `Decoder.list` / etc. companion combinators, and the `Decoder.tagged.*` namespace already shipped in 1.x — those are not new in 2.0. 2.0 is the cleanup pass that removes the deprecated alternative.

### Historical context (mechanism of the pre-1.3 request-side bug)

The request-side default wire-shape bug (`{age: Option(30)}` serializing as `{"age":{"_tag":"Some","value":30,"isEmpty":false,"size":1}}`) was caused not by *every* ADT having a `toJSON()` that returned `{_tag, value}` — only `Either` had a `toJSON()` method pre-fix. The other ADTs leaked their full property bag through `JSON.stringify`'s default object enumeration. The 1.3 fix did two things: (1) added explicit `toJSON()` methods to every ADT (so even without the body walker, raw `JSON.stringify` on an ADT now produces a sane tagged envelope), and (2) added the `normalizeBody` walker in `Http.ts` that strips ADTs to JSON-friendly primitives by default (`Option → nullable`, `List → array`, `Either.Right → value | throw on Left`, etc.). Both are now part of the 1.3+ baseline.

## Why this shape (design rationale)

The decision was: `Decoder<A> = (raw) => Either<DecoderError, A>` with `DecoderError` recursive.

| Rejected option | Why rejected |
|---|---|
| `Either<List<DecoderError>, A>` (flat list, paths via strings) | Loses structural info; "user.name and user.age both failed" reads worse than a tree mirroring the input |
| `Validated<NonEmptyList<DecoderError>, A>` (cats/circe approach) | Adds a wrapper everyone has to learn; doesn't compose with the rest of the HTTP stack which uses Either; the type-level guarantee it buys (no accidental short-circuit via flatMap) is a cats/Haskell consistency-law concern that doesn't apply in TS |
| Full `Codec<A>` with encode + decode + combinator parallelism | Unified-schema-for-both-directions only pays off when request and response shapes mirror; in real REST they usually don't (POST `{name, email}` → GET returns `{id, name, email, createdAt, updatedAt}`). Combinator suite doubles surface area for rubber-stamp work TypeScript already verifies on the input side. Ship type alias + per-call hook now; grow combinators later if demand appears. |
| `Encoder<A>` combinator suite NOW (`Encoder.object`, `Encoder.option`, …) | Same logic as Codec: the combinators mostly duplicate what `flatten: true` already does for the 95% case. Type alias + per-call `encode?` hook is the minimum that closes the symmetry gap without committing to a parallel combinator tree. |
| Keep `validate` field, change signature to Either-returning | Silent type errors on every existing call site; no rename signal |
| Keep `validate` (throw) + add `validator` (Either) field | Two-fields-one-concept API debt forever |

Chosen because:
- **Effect-style recursive error matches Composite/Leaf cleanly.** functype excels at recursive tagged ADTs.
- **Single Either return type composes with everything else** (`HttpResponse<T>`, IO chain, `.fold`).
- **Accumulation in the data, not the wrapper.** Either's `flatMap` keeps its expected short-circuit semantics; users never face the cats/Validated split.
- **`decode` is the honest verb** for unknown→typed conversion; `Decoder<T>` reads better than `Validator<T>` for combinator composition (`Decoder.option(Decoder.number)`).
- **Fresh field names** (`decode`/`decodeUnsafe`) mean a missing-field error on upgrade, not a silent type mismatch.

## Priority order (2.0 surface only)

1. **`validate` is gone.** Existing call sites get a TypeScript error on upgrade — that's the rename signal. Migration: `s/validate:/decodeUnsafe:/g` for callers using Zod's `.parse` or other throw-pattern validators; new code uses `decode:` with `Decoder.fromZod(...)` or a hand-composed `Decoder.object({...})`.
2. **`encode` is the new escape hatch on the request side.** Shape: `(value: TReq) => JSONValue`. Only used when the existing `flatten: true|false` (shipped 1.3) isn't expressive enough — custom Date formats, snake_case keys, output validation, field-stripping. Hand-written per-endpoint; no combinator companion in 2.0.

The pre-existing 1.3+ behavior — `flatten: true` default (external-JSON-first), `flatten: false` opt-in (tagged round-trip with `Decoder.tagged.*`), `decode: Decoder<T>` as the plugin API — is unchanged in 2.0. 2.0 only removes `validate` and adds `encode` + `Encoder<A>`.

## Round-trip semantics (both directions of the wire)

Four exhaustive cases — three are shipped 1.3+ behavior, one is the 2.0 addition. The new field is `encode?: Encoder<TReq>` per-call (`flatten` and `decode` are not changing in 2.0).

| Case | Body in | Wire out | Wire in | Decoded |
|---|---|---|---|---|
| **External API, no ADTs** *(1.3 baseline)* | `{name, age: 30}` | `{"name":"...","age":30}` | `{"name":"...","age":30}` | `{name, age}` (decode optional) |
| **External API, ADTs in body** *(1.3 default flatten)* | `{name, age: Option(30)}` | `{"name":"...","age":30}` | `{"name":"...","age":30}` | `{name, age: Option(30)}` via `Decoder.option(Decoder.number)` |
| **External API, custom transform** *(new in 2.0, per-call `encode`)* | `{name, createdAt: Date}` | `{"name":"...","created_at":"2026-06-01"}` | …whatever the server returns | matched `Decoder` |
| **Functype-to-functype** *(1.3 `flatten: false`)* | `{name, age: Option(30)}` | `{"name":"...","age":{"_tag":"Some","value":30}}` | `{"name":"...","age":{"_tag":"Some","value":30}}` | `{name, age: Option(30)}` via `Decoder.tagged.option(Decoder.number)` |

**The encode/decode design (minimum-symmetric, not full Codec):**
- **Decode side already has primitives + ADT combinators** (shipped pre-2.0) — `Decoder.string`, `Decoder.object`, `Decoder.option`, etc. — because raw JSON is opaque to TypeScript and combinators do real type-system work.
- **Encode side ships in 2.0 as type alias + per-call hook only** (`type Encoder<A> = (value: A) => JSONValue`, `encode?: Encoder<TReq>`). TypeScript already enforces the input shape, so combinator parallelism would be rubber-stamp work for the 95% case. The `encode?` hook handles the 5% that `flatten: true|false` can't express. Hand-written per endpoint when needed.
- **Resolution rule:** if `encode` is provided, it runs first and its output is JSON-stringified directly (ignores `flatten`). Otherwise the framework runs the 1.3+ `normalizeBody` walker (or skips it when `flatten: false`).

**Explicitly NOT shipping in 2.0:**
- `Encoder.object` / `Encoder.option` / `Encoder.list` / etc. combinator suite. Gate on real consumer demand; add in 2.1+ if usage shows users hand-writing the same encoders.
- Full bidirectional `Codec<A>` (one schema → both directions). Real DX win only when request and response shapes mirror, which is the exception not the rule in REST. Revisit if a use case forces it.
- Per-field encoder DSL (mixing flatten and tagged on the same call). The per-call `encode?` hook subsumes this — write the whole transform in a function.
- Client-level encode mode (default flatten on the `HttpClient`). Per-call only for v1; add `defaultFlatten?: boolean` later if asked.

## Approach

### 1. Recursive `DecoderError` ADT in core — SHIPPED IN 1.1.0, NOT 2.0 WORK

This section is preserved for reference — `DecoderError` shipped in `packages/functype/src/decoder/DecoderError.ts` (1.1.0). Named `DecoderError` (not `DecodeError`) to avoid collision with the existing `HttpError.DecodeError` variant: the HTTP variant is the outer wrapper, this is the structural inner cause.

```ts
export type DecoderError = DecoderErrorLeaf | DecoderErrorComposite

export type DecoderErrorLeaf = {
  readonly _tag: "Leaf"
  readonly path: ReadonlyArray<string>
  readonly message: string
  readonly cause?: unknown
}

export type DecoderErrorComposite = {
  readonly _tag: "Composite"
  readonly path: ReadonlyArray<string>
  readonly children: List<DecoderError>
}

// Companion (built via `Companion(...)`): leaf, composite, isLeaf, isComposite,
// match, prepend (attributes a child decoder's failures to its field/index),
// flatten() => List<{path, message}>, format() => string for display.
```

A `Composite` is created by combinators (`Decoder.object`, `Decoder.list`, etc.) when more than one child decoder fails. A single-child failure is unwrapped to a `Leaf` for cleaner error messages.

### 2. `Decoder<A>` type alias in core — SHIPPED IN 1.1.0, NOT 2.0 WORK

`packages/functype/src/decoder/Decoder.ts`:

```ts
export type Decoder<A> = (raw: unknown) => Either<DecoderError, A>
```

Companion `DecoderCompanion` in `packages/functype/src/decoder/DecoderCompanion.ts`. All ADT decoders **accumulate** by gathering errors from child decoders into a `Composite`:

- `Decoder.string`, `Decoder.number`, `Decoder.boolean`, `Decoder.unknown` — leaf primitives via `typeof` (load-bearing for composing without a schema lib)
- `Decoder.nullable<A>(inner)` — `raw == null ? Right(null) : inner(raw)`
- `Decoder.option<A>(inner): Decoder<Option<A>>` — null-bias: `raw == null ? Right(None) : inner(raw).map(Some)`
- `Decoder.either<L, R>(left, right)` — two named variants, no default:
  - `Decoder.either.envelope({ok, err})` for `{ok: T} | {err: E}` shape
  - `Decoder.either.discriminated({tag, leftTag, rightTag}, left, right)` for custom-tag union shapes
- `Decoder.list<A>(inner): Decoder<List<A>>` — array → `List`, accumulates index failures into `Composite` with `path: ["[0]", "[1]", ...]`
- `Decoder.array<A>(inner): Decoder<A[]>` — plain array passthrough
- `Decoder.map<K extends string, V>(inner): Decoder<Map<K, V>>`
- `Decoder.object<T>(shape: { [K in keyof T]: Decoder<T[K]> }): Decoder<T>` — record-of-decoders; accumulates field failures into `Composite` with `path: ["field1", "field2", ...]`

`Decoder.object` accumulation implementation (the library invariant — ~15 lines):

```ts
const object = <T>(shape: { [K in keyof T]: Decoder<T[K]> }): Decoder<T> => (raw) => {
  if (typeof raw !== "object" || raw === null) {
    return Left(DecoderError.leaf([], "expected object", { received: raw }))
  }
  const errors: DecoderError[] = []
  const out: Partial<T> = {}
  for (const key in shape) {
    const result = shape[key]((raw as any)[key])
    result.fold(
      (e) => errors.push({ ...e, path: [key, ...e.path] }),
      (v) => { out[key] = v }
    )
  }
  return errors.length === 0
    ? Right(out as T)
    : errors.length === 1
      ? Left(errors[0])  // unwrap single-child composite
      : Left(DecoderError.composite([], List(errors)))
}
```

Tagged variants for opt-in functype-to-functype, in `packages/functype/src/decoder/tagged.ts`:

- `Decoder.tagged.option<A>(inner)` — decodes `{_tag: "Some" | "None", value}` using `OptionCompanion.fromJSON(JSON.stringify(raw))`. Same shape for `tagged.either`, `tagged.try`, `tagged.list`, `tagged.map`, `tagged.obj`. Pure wrappers over existing `fromJSON` companions.

### 3. ~~Fix the latent request-side bug~~ — SHIPPED IN 1.3, NOT 2.0 WORK

This section is preserved for historical context only — the request-side wire-flatten work shipped in 1.3 as a non-breaking default change.

- The walker is `normalizeBody` in `packages/functype/src/fetch/Http.ts`. It dispatches on `Symbol.toStringTag` via the `hasToStringTag(value, "Option" | "Either" | "Try" | "List" | "FunctypeMap")` helper (duck-typing on the well-known symbol that each ADT sets on itself). It does NOT use `Option.isOption(v)` / `Either.isEither(v)` predicates — those are not part of the public surface (the closest public alternatives are `HKT.isOption` / `HKT.isList` / `HKT.isEither` / `HKT.isTry` on the `HKT` object; `isMap` doesn't exist as a public predicate). Duck-typing on the `Symbol.toStringTag` works for the request-side use case and avoids importing the predicates.
- Behavior mirrors the original sketch: `Option → toNullable()`, `Either → right value or throw on Left`, `Try → success value or throw on Failure`, `List → array (recurse)`, `FunctypeMap → record (recurse, throw on non-string keys)`. Two modes — `"primitive"` (default, `flatten: true`) and `"tagged"` (`flatten: false`) — the tagged mode emits canonical `{_tag, value}` envelopes for `Decoder.tagged.*` round-trips with functype-to-functype services.
- `HttpRequestOptions` already has `readonly flatten?: boolean` (default `true`).
- Nothing further needed in 2.0 here.

### 4. Wire `Encoder<TReq>` into the HTTP request — remove `validate`

`packages/functype/src/fetch/HttpRequest.ts` — `HttpRequestOptions<T, TReq = unknown>`:

```ts
// REMOVED (2.0):
// readonly validate?: (data: unknown) => T

// ALREADY IN 1.3 (no change):
readonly decode?: Decoder<T>            // Either-returning, default path
readonly flatten?: boolean              // default true; false preserves tagged emission via Symbol.toStringTag walker

// ADDED (2.0, response side):
readonly decodeUnsafe?: (raw: unknown) => T  // throw-or-pass; replaces `validate`'s role for adapters whose primary API throws (e.g. Zod's .parse)

// ADDED (2.0, request side):
readonly encode?: Encoder<TReq>         // typed → JSONValue escape hatch; bypasses flatten if provided
```

`Http.ts` `parseResponse` flow (2.0):
- If `decode` provided: existing 1.3+ behavior — `decode(raw).fold(err => throw HttpErrorCompanion.decodeError(url, method, body, err), identity)`. Unchanged.
- Else if `decodeUnsafe` provided: throw-or-pass. The `validate` path that previously fell here is now gone; `decodeUnsafe` replaces it with a clearer name.
- Else: cast to `T`.

`Http.ts` `serializeBody` flow (2.0 addition):
- If `encode` provided: `JSON.stringify(encode(body))`. `flatten` is ignored.
- Else if `flatten: false`: `JSON.stringify(body)` (1.3+ tagged-emission behavior via the per-ADT `.toJSON()` methods).
- Else (default): `JSON.stringify(normalizeBody(body, "primitive"))` — the 1.3+ default. Unchanged.

`HttpClientConfig` does NOT gain `decode`/`encode` fields — per-call only for 2.0; revisit if client-level defaults are asked for.

### 4b. `Encoder<A>` type alias

New file `packages/functype/src/decoder/Encoder.ts` (co-located with Decoder; same `functype/decoder` barrel):

```ts
import type { JSONValue } from "@/serialization"

export type Encoder<A> = (value: A) => JSONValue
```

That's the entire module for 2.0 — no companion, no combinators. The point is to publish the type alias so users can write `const userEncoder: Encoder<User> = (u) => ({...})` with a named contract, and so the HTTP `encode?` field has a type to reference. Combinator companion (`Encoder.object`, `Encoder.option`, etc.) deferred to 2.1+ pending real demand.

### 5. Adapter packages (separate PRs, separate releases)

**Pluggability is structural, not added-on.** `Decoder<T>` is the type alias `(raw: unknown) => Either<DecoderError, T>`. Anything that produces that shape IS a decoder — no registration, no plugin API, no factory. A TypeBox / Valibot / AJV / hand-rolled user writes ~15 lines themselves:

```ts
import { TypeCompiler } from "@sinclair/typebox/compiler"
import type { Decoder } from "functype/decoder"
import { Left, Right } from "functype"

const myTypeBoxDecoder = <T>(schema: TSchema): Decoder<T> => {
  const checked = TypeCompiler.Compile(schema)
  return (raw) => {
    const errs = [...checked.Errors(raw)]
    return errs.length === 0
      ? Right(raw as T)
      : Left(DecoderError.leaf(errs[0].path.split("/").filter(Boolean), errs[0].message))
  }
}
```

Decoders from any source compose freely:

```ts
Decoder.object({
  user:    Decoder.fromZod(ZodUserSchema),         // from functype-zod
  perms:   Decoder.option(myTypeBoxDecoder(...)),  // user's own TypeBox, wrapped in ADT
  history: Decoder.list(myAjvDecoder),             // user's own AJV
})
```

**Recommendation: ship `functype-zod` only.** Others stay docs-only. Rationale:
- Zod has ~30M weekly downloads, de-facto TS schema lib.
- Bridge ships real value: discoverability, full Zod issue-tree → `DecoderError` recursive mapping (Composite preserves Zod's nested issue tree), type inference (`Decoder.fromZod(s): Decoder<z.infer<typeof s>>`).
- Sets the `Decoder.fromX` naming template for community adapters.
- ArkType, TypeBox, Valibot, Effect/Schema: document the 15-line snippet, build only on user request to avoid maintaining N moving targets against schema-lib churn.

`functype-zod` peer-depends on `functype` (`>=2.0.0`, per the post-cascade peer-dep convention) and on `zod` as a regular dep.

## Critical files

Files that already ship the 1.3+ baseline (NO CHANGE in 2.0):

- `packages/functype/src/decoder/Decoder.ts`, `DecoderError.ts`, `DecoderCompanion.ts`, `tagged.ts`, `index.ts` — `Decoder<T>`, recursive `DecoderError`, primitives, ADT combinators, tagged variants all shipped pre-2.0.
- `packages/functype/src/fetch/Http.ts` — `normalizeBody` walker, `flatten: true|false` modes, per-ADT `.toJSON()` envelopes all shipped pre-2.0.
- `packages/functype/src/fetch/HttpRequest.ts.decode` field shipped pre-2.0.
- `packages/functype/src/fetch/HttpError.ts.decodeError.cause` typed as the recursive `DecoderError` shipped pre-2.0.

Files that change in 2.0:

| File | Change |
|---|---|
| `packages/functype/src/decoder/Encoder.ts` | NEW — `type Encoder<A> = (value: A) => JSONValue` alias (no companion, no combinators in 2.0). |
| `packages/functype/src/decoder/index.ts` | MODIFY — re-export `Encoder` alongside `Decoder` / `DecoderError`. |
| `packages/functype/src/fetch/HttpRequest.ts` | MODIFY — **remove** `validate?`; **add** `decodeUnsafe?: (raw: unknown) => T` and `encode?: Encoder<TReq>`. `decode?` and `flatten?` stay. |
| `packages/functype/src/fetch/Http.ts` | MODIFY — `serializeBody` precedence: `encode` (highest) → `flatten: false` → default `normalizeBody`. `parseResponse` drops the `validate` branch (`decode` / `decodeUnsafe` / direct-cast remain). |
| `packages/functype/src/fetch/index.ts` | MODIFY — re-export `Encoder` type alias. |
| `packages/functype/src/cli/data.ts` | MODIFY — Http section: remove `validate` entry; add `decodeUnsafe`, `encode`. |
| `packages/functype/test/fetch/http.spec.ts` and `http-production.spec.ts` | MODIFY — update any remaining `validate:` test sites to `decodeUnsafe:`. Add tests asserting `encode` precedence over `flatten` (custom transform lands on the wire). |
| `packages/functype/test/decoder/encoder.spec.ts` | NEW — minimal: type alias assignability + per-call `encode?` precedence over `flatten` in `Http`. |
| `packages/functype/CLAUDE.md` | MODIFY — Quick-ref Http section: remove `validate` deprecation note; add `decodeUnsafe`, `encode`, `Encoder<A>`. 2.0.0 migration callout. |
| `site/src/content/http.md` | MODIFY — drop the "deprecated `validate`" callout; add `encode` escape-hatch section; 2.0.0 migration note. |
| `packages/functype/CHANGELOG.md` | MODIFY — 2.0.0 entry documenting the breaking change. |

## Reuse

- `Decoder.tagged.*` and the `fromJSON` companions on each ADT — shipped pre-2.0; no change.
- `normalizeBody` in `Http.ts` — dispatches on `Symbol.toStringTag` via the `hasToStringTag(value, "Option" | "Either" | "Try" | "List" | "FunctypeMap")` helper. Public predicates `HKT.isOption` / `HKT.isList` / `HKT.isEither` / `HKT.isTry` exist on the `HKT` object if needed (no `isMap`), but the body walker uses duck-typing on the well-known symbol for performance and to avoid coupling the request-side walker to the higher-kinded-type machinery.
- `HttpError.decodeError` — decoder failures still map to it; `cause` field already typed as `DecoderError` from the 1.3 work.
- `JSONValue` (shipped 1.2.2 via `Serialization`, re-exported from the top barrel) — `Encoder<A>` returns this type. No need to redefine.
- `SerializationCompanion` — orthogonal; provides YAML/binary serialization that the decoder layer does not duplicate.
- Existing recursive-ADT patterns in functype (`Either`, `Try` themselves are recursive sum types, plus the now-shipped `DecoderError`) — module conventions are consistent.

## Verification

1. `pnpm -F functype test test/fetch/` — existing flatten / decode tests still pass; new tests cover `encode` precedence (custom shape lands on the wire, ignoring `flatten`).
2. `pnpm -F functype test test/decoder/encoder.spec.ts` — assert `type Encoder<A>` accepts a hand-written function and returns `JSONValue`.
3. `pnpm turbo run validate` — full workspace check; confirm no upgrade callers still reference `validate` field.
4. **Migration grep** in consumer codebases (cq-api, etc.): `grep -r "validate:" packages/*/src` should find zero call sites after migration. Common transform: `s/validate:/decodeUnsafe:/g` for throw-pattern adapters; rewrite for `decode:` + `Decoder.fromZod(...)` for Either-returning paths.
5. Manual: small client against `httpbin.org` POST with a hand-rolled `encode` doing camelCase → snake_case; verify the echoed body matches the encoded shape.
6. Bundle-size CI job for `packages/functype/**` — confirm `Encoder.ts` (one-line type alias) adds essentially zero gzipped delta.
7. `mcp__functype__validate_code` after publish (against 2.0.0) to confirm the post-break public types compile in a fresh consumer.

## What's deliberately out of scope

- **Schema-library adapter packages** (`functype-zod` etc.) — separate PRs once `Decoder` is in. Only `functype-zod` recommended; others docs-only.
- **`Encoder.object` / `Encoder.option` / `Encoder.list` etc. combinator suite.** Shipping the `Encoder<A>` type alias + per-call `encode?` hook gives the symmetry and the escape hatch; combinator parallelism mostly rubber-stamps work TypeScript already verifies on the input side. Gate on real consumer demand; grow in 2.1+ if users hand-write the same encoders enough.
- **Full bidirectional `Codec<A>`** (one schema produces both encode and decode). Real DX win only when request and response shapes mirror, which is the exception in REST. Revisit if real usage shows the demand.
- **Client-level default decoder/encoder** — per-call only for v1; add `responseDecoder?` / `requestEncoder?` on `HttpClientConfig` later if asked.
- **Streaming / chunked body decoders** — `Decoder` is value-in/value-out; streaming is a separate IO problem.
- **YAML/binary wire formats for HTTP** — `SerializationCompanion` handles these for storage; not an HTTP need.
- **DecoderError formatting / pretty-printing as a library feature beyond `format()`** — basic format only; rich rendering (colors, source spans) is a separate concern.

## Release notes outline (for changeset)

```
Major (functype 2.0.0):

BREAKING:
- `HttpRequestOptions.validate` field removed. Replace with `decode: Decoder<T>` (Either-returning,
  shipped 1.3) or `decodeUnsafe: (raw) => T` (throw-or-pass, new in 2.0) per call.
  - Migration: most callers `s/validate:/decodeUnsafe:/g` if they were using Zod's `.parse` or
    throw patterns. New code prefers `decode:` with `Decoder.fromZod(...)` from `functype-zod`
    or a hand-composed `Decoder.object({...})`.

NEW:
- `HttpRequestOptions.decodeUnsafe?: (raw: unknown) => T` — throw-or-pass replacement for the
  removed `validate` field. Use for adapters whose primary API throws (Zod's `.parse`).
- `Encoder<A> = (value: A) => JSONValue` type alias exported from `functype/decoder`. Named
  contract for request-body transforms; no companion combinators in this release (grow in 2.1+
  if demand appears).
- `HttpRequestOptions.encode?: Encoder<TReq>` — per-call hook for custom request-body transforms
  (Date formats, key renaming, output validation, field-stripping). Takes precedence over
  `flatten`.

UNCHANGED (shipped pre-2.0; documented here for completeness):
- `Decoder<T>` interface, recursive `DecoderError` ADT, primitives/combinators
  (`Decoder.string`, `Decoder.object`, `Decoder.option`, etc.), and `Decoder.tagged.*`
  namespace — all shipped in 1.x.
- Request body auto-flatten via `HttpRequestOptions.flatten?: boolean` (default `true`) and the
  internal `normalizeBody` walker — shipped in 1.3.
```
