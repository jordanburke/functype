# HTTP wire-format: flatten bugfix + Decoder/Encoder interface (2.0.0)

## Context

The `functype/fetch` HTTP client today is BYOV (bring your own validator) on the response side and `JSON.stringify`-with-side-effects on the request side. Two problems:

1. **External-API silent breakage on the request side.** `JSON.stringify` natively invokes `.toJSON()` on any object that defines one. Every functype ADT (`Option`, `Either`, `Try`, `List`, `Map`, `Obj`) defines `.toJSON()` returning `{_tag, value}`. So `client.post("/api/users", {name, age: Option(30)})` against a third-party REST API today silently sends `{"name":"...","age":{"_tag":"Some","value":30}}` — the server rejects it. The 95%-case wire shape is wrong by default.

2. **No first-class, accumulating, Either-returning decoder for response bodies.** The existing `validate: (data: unknown) => T` is throw-or-pass — it doesn't compose with the IO chain that `beforeRequest` just unlocked in 1.0.1, and it has no named contract that adapter packages (Zod/ArkType/TypeBox) can target. There's also no shared error shape, so every user invents their own error tree.

Intended outcome:
- Fix the latent request-side bug so the default wire shape is what external APIs expect.
- Name the response-side decoder contract as `Decoder<T>`. Adopt the **Effect-TS Schema design**: `Decoder<A> = (raw: unknown) => Either<DecodeError, A>` where `DecodeError` is a **recursive tagged ADT** (`Leaf | Composite`) that mirrors the structure of the input. Accumulation lives in the error data, not in the wrapper — no `Validated`, no cats/Applicative gymnastics.
- Ship ADT decoders (`Decoder.option`, `Decoder.either`, `Decoder.list`, etc.) — the only piece a schema lib can't write because they need functype internals.
- Two field names on `HttpRequestOptions`: `decode: Decoder<T>` (Either-returning, default) and `decodeUnsafe: (raw) => T` (throw-or-pass, escape hatch for Zod's `.parse` and inline lambdas).
- Ship a minimum encode side: `type Encoder<A> = (value: A) => JSONValue` (one-line alias) + `encode?: Encoder<TReq>` per-call hook on `HttpRequestOptions`. Closes the symmetry gap and gives a clean escape hatch for custom Date formats, camelCase↔snake_case, output validation, field-stripping — anything `flatten: true|false` can't express. **Do NOT ship the combinator suite** (`Encoder.object`, `Encoder.option`, etc.) or full bidirectional `Codec<A>`; grow those in 2.1+ only if real usage drives them.

This is a 2.0.0 release because the existing `validate` field is removed in favor of `decode`/`decodeUnsafe`.

## Why this shape (design rationale)

The decision was: `Decoder<A> = (raw) => Either<DecodeError, A>` with `DecodeError` recursive.

| Rejected option | Why rejected |
|---|---|
| `Either<List<DecodeError>, A>` (flat list, paths via strings) | Loses structural info; "user.name and user.age both failed" reads worse than a tree mirroring the input |
| `Validated<NonEmptyList<DecodeError>, A>` (cats/circe approach) | Adds a wrapper everyone has to learn; doesn't compose with the rest of the HTTP stack which uses Either; the type-level guarantee it buys (no accidental short-circuit via flatMap) is a cats/Haskell consistency-law concern that doesn't apply in TS |
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

## Priority order

1. **External-JSON-first is the default.** `Option<T>` in a body flattens to `T | null`. Wire shape is indistinguishable from `fetch + zod`.
2. **Functype-to-functype is opt-in.** A `{flatten: false}` flag on the request preserves the existing auto-tagged emission for cohesive ecosystems. No new code path on the request side — just disables the new flatten step.
3. **`decode` is the new BYOV path.** Pure-typed contract: `(raw: unknown) => Either<DecodeError, A>`. Anyone — Zod user, TypeBox user, hand-roller — produces a function of this shape. No plugin registration; it IS the plugin API.
4. **`encode` is the escape hatch.** Same shape going out: `(value: TReq) => JSONValue`. Only used when `flatten: true|false` isn't expressive enough (custom Date formats, snake_case keys, output validation, field-stripping). Hand-written per-endpoint; no combinator companion in 2.0.

## Round-trip semantics (both directions of the wire)

Four exhaustive cases, covered by `flatten: true|false` (framework-level structural), the `encode?` per-call escape hatch (user-level custom transforms), and the `decode`/`decodeUnsafe` field on the response side:

| Case | Body in | Wire out | Wire in | Decoded |
|---|---|---|---|---|
| **External API, no ADTs** | `{name, age: 30}` | `{"name":"...","age":30}` | `{"name":"...","age":30}` | `{name, age}` (decode optional) |
| **External API, ADTs in body** (default flatten) | `{name, age: Option(30)}` | `{"name":"...","age":30}` | `{"name":"...","age":30}` | `{name, age: Option(30)}` via `Decoder.option(Decoder.number)` |
| **External API, custom transform** (per-call `encode`) | `{name, createdAt: Date}` | `{"name":"...","created_at":"2026-06-01"}` | …whatever the server returns | matched `Decoder` |
| **Functype-to-functype** (`flatten: false`) | `{name, age: Option(30)}` | `{"name":"...","age":{"_tag":"Some","value":30}}` | `{"name":"...","age":{"_tag":"Some","value":30}}` | `{name, age: Option(30)}` via `Decoder.tagged.option(Decoder.number)` |

**The encode/decode design (minimum-symmetric, not full Codec):**
- **Decode side has primitives + ADT combinators** (`Decoder.string`, `Decoder.object`, `Decoder.option`, …) because raw JSON is opaque to TypeScript — combinators do real type-system work.
- **Encode side ships as type alias + per-call hook only** (`type Encoder<A> = (value: A) => JSONValue`, `encode?: Encoder<TReq>`). TypeScript already enforces the input shape, so combinator parallelism would be rubber-stamp work for the 95% case. The `encode?` hook handles the 5% that `flatten: true|false` can't express — custom Date formats, key renaming, output validation, field-stripping. Hand-written per endpoint when needed.
- **Resolution rule:** if `encode` is provided, it runs first and its output is JSON-stringified directly (ignores `flatten`). Otherwise the framework runs `flattenFunctype` (or skips it when `flatten: false`).

**Explicitly NOT shipping in 2.0:**
- `Encoder.object` / `Encoder.option` / `Encoder.list` / etc. combinator suite. Gate on real consumer demand; add in 2.1+ if usage shows users hand-writing the same encoders.
- Full bidirectional `Codec<A>` (one schema → both directions). Real DX win only when request and response shapes mirror, which is the exception not the rule in REST. Revisit if a use case forces it.
- Per-field encoder DSL (mixing flatten and tagged on the same call). The per-call `encode?` hook subsumes this — write the whole transform in a function.
- Client-level encode mode (default flatten on the `HttpClient`). Per-call only for v1; add `defaultFlatten?: boolean` later if asked.

## Approach

### 1. Recursive `DecodeError` ADT in core

New file `packages/functype/src/decoder/DecodeError.ts`:

```ts
export type DecodeError =
  | { readonly _tag: "Leaf"; readonly path: string[]; readonly message: string; readonly cause?: unknown }
  | { readonly _tag: "Composite"; readonly path: string[]; readonly children: List<DecodeError> }

export const DecodeError = {
  leaf: (path: string[], message: string, cause?: unknown): DecodeError =>
    ({ _tag: "Leaf", path, message, cause }),
  composite: (path: string[], children: List<DecodeError>): DecodeError =>
    ({ _tag: "Composite", path, children }),
  // helpers: flatten() => List<{path, message}>, format() => string for display
}
```

A `Composite` is created by combinators (`Decoder.object`, `Decoder.list`, etc.) when more than one child decoder fails. A single-child failure can be unwrapped to a `Leaf` for cleaner error messages.

### 2. `Decoder<A>` interface in core

New file `packages/functype/src/decoder/Decoder.ts`:

```ts
export type Decoder<A> = (raw: unknown) => Either<DecodeError, A>
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
    return Left(DecodeError.leaf([], "expected object", { received: raw }))
  }
  const errors: DecodeError[] = []
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
      : Left(DecodeError.composite([], List(errors)))
}
```

Tagged variants for opt-in functype-to-functype, in `packages/functype/src/decoder/tagged.ts`:

- `Decoder.tagged.option<A>(inner)` — decodes `{_tag: "Some" | "None", value}` using `OptionCompanion.fromJSON(JSON.stringify(raw))`. Same shape for `tagged.either`, `tagged.try`, `tagged.list`, `tagged.map`, `tagged.obj`. Pure wrappers over existing `fromJSON` companions.

### 3. Fix the latent request-side bug

`packages/functype/src/fetch/Http.ts` — `serializeBody` (lines 19–28): before `JSON.stringify`, walk the body and replace functype ADTs with their primitive projections. New helper `flattenFunctype(value: unknown): unknown`:

- `Option.isOption(v)` → `v.toNullable()`
- `Either.isEither(v)` → `v.fold(throwLeft, identity)` (Left in a request body is a programmer error — throw at call site)
- `Try.isTry(v)` → `v.fold(throwFailure, identity)`
- `List.isList(v)` → `[...v]` then recurse on each element
- `Map.isMap(v)` → `Object.fromEntries(v.entries())` (string-key maps only; throws otherwise)
- Plain objects/arrays: recurse
- Primitives, Dates, etc.: pass through

All `isX` predicates already exist (verify during impl in `src/{option,either,try,list,map}/`). Pre-flatten rather than `JSON.stringify` replacer — clearer and gives the response-side decoder a parallel touchpoint.

`HttpRequestOptions` gains `readonly flatten?: boolean` (default `true`). Setting `flatten: false` skips the walk and preserves the current auto-tagged emission for functype-to-functype services. This is the *opt-in* tagged mode.

**Breaking note for changeset:** the accidental tagged emission was undocumented and almost certainly unintentional; ship as a bug fix with `flatten: false` as the explicit migration path for the rare case anyone was relying on it.

### 4. Wire `Decoder<T>` + `Encoder<TReq>` into the HTTP request — replace `validate`

`packages/functype/src/fetch/HttpRequest.ts` — `HttpRequestOptions<T, TReq = unknown>` gets new fields, drops old:

```ts
// REMOVED:
// readonly validate?: (data: unknown) => T

// ADDED (response side):
readonly decode?: Decoder<T>            // Either-returning, default path
readonly decodeUnsafe?: (raw: unknown) => T  // throw-or-pass, for Zod's .parse and inline lambdas

// ADDED (request side):
readonly encode?: Encoder<TReq>         // typed → JSONValue escape hatch; bypasses flatten if provided
readonly flatten?: boolean              // default true; false preserves auto-tagged emission
```

`Http.ts` `parseResponse` flow:
- If `decode` provided: `decode(raw).fold(err => throw HttpErrorCompanion.decodeError(url, method, body, err), identity)` — preserves the existing error contract (throw → `HttpError.decodeError` containing the recursive `DecodeError` as `cause`) so no IO-chain breaking change.
- Else if `decodeUnsafe` provided: existing throw-or-pass path with `decodeUnsafe` instead of `validate`.
- Else: cast to `T`.

`Http.ts` `serializeBody` flow:
- If `encode` provided: `JSON.stringify(encode(body))`. `flatten` is ignored.
- Else if `flatten: false`: `JSON.stringify(body)` (current tagged-emission behavior via native `.toJSON()`).
- Else (default): `JSON.stringify(flattenFunctype(body))`.

`HttpClientConfig` does NOT gain `decode`/`encode` fields — per-call only for v1; revisit if client-level defaults are asked for.

### 4b. `Encoder<A>` type alias

New file `packages/functype/src/decoder/Encoder.ts` (co-located with Decoder; same `functype/decoder` barrel):

```ts
import type { JSONValue } from "@/serialization"

export type Encoder<A> = (value: A) => JSONValue
```

That's the entire module for 2.0 — no companion, no combinators. The point is to publish the type alias so users can write `const userEncoder: Encoder<User> = (u) => ({...})` with a named contract, and so the HTTP `encode?` field has a type to reference. Combinator companion (`Encoder.object`, `Encoder.option`, etc.) deferred to 2.1+ pending real demand.

### 5. Adapter packages (separate PRs, separate releases)

**Pluggability is structural, not added-on.** `Decoder<T>` is the type alias `(raw: unknown) => Either<DecodeError, T>`. Anything that produces that shape IS a decoder — no registration, no plugin API, no factory. A TypeBox / Valibot / AJV / hand-rolled user writes ~15 lines themselves:

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
      : Left(DecodeError.leaf(errs[0].path.split("/").filter(Boolean), errs[0].message))
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
- Bridge ships real value: discoverability, full Zod issue-tree → `DecodeError` recursive mapping (Composite preserves Zod's nested issue tree), type inference (`Decoder.fromZod(s): Decoder<z.infer<typeof s>>`).
- Sets the `Decoder.fromX` naming template for community adapters.
- ArkType, TypeBox, Valibot, Effect/Schema: document the 15-line snippet, build only on user request to avoid maintaining N moving targets against schema-lib churn.

`functype-zod` peer-depends on `functype` (`>=2.0.0`, per the post-cascade peer-dep convention) and on `zod` as a regular dep.

## Critical files

| File | Change |
|---|---|
| `packages/functype/src/decoder/DecodeError.ts` | NEW — recursive tagged ADT + helpers (`flatten`, `format`) |
| `packages/functype/src/decoder/Decoder.ts` | NEW — `type Decoder<A>` alias |
| `packages/functype/src/decoder/Encoder.ts` | NEW — `type Encoder<A> = (value: A) => JSONValue` alias (no companion, no combinators in 2.0) |
| `packages/functype/src/decoder/DecoderCompanion.ts` | NEW — primitives + ADT decoders (null-bias by default, accumulating) |
| `packages/functype/src/decoder/tagged.ts` | NEW — `Decoder.tagged.*` namespace using existing `fromJSON` |
| `packages/functype/src/decoder/index.ts` | NEW — barrel; re-exports `Decoder`, `Encoder`, `DecodeError`; re-exported from `src/index.ts` |
| `packages/functype/src/fetch/Http.ts` | MODIFY — `serializeBody` honors `encode` (highest precedence) → `flatten: false` (raw stringify) → default `flattenFunctype` walk; `parseResponse` honors `decode`/`decodeUnsafe`; remove `validate` path |
| `packages/functype/src/fetch/HttpRequest.ts` | MODIFY — drop `validate`; add `decode`, `decodeUnsafe`, `encode`, `flatten` |
| `packages/functype/src/fetch/HttpError.ts` | MODIFY — `decodeError`'s `cause` field typed as `DecodeError \| Error` (was unknown) |
| `packages/functype/src/cli/data.ts` | MODIFY — update Http description; add Decoder + DecodeError entries |
| `packages/functype/test/fetch/http.spec.ts` | MODIFY — assert `{age: Option(30)}` body emits `{"age":30}` by default, `{"age":{"_tag":"Some","value":30}}` with `flatten: false`, custom shape with `encode`; update validate→decode call sites |
| `packages/functype/test/decoder/decoder.spec.ts` | NEW — primitives, ADT decoders, accumulation (multi-field failure → Composite), recursive paths, tagged round-trips |
| `packages/functype/test/decoder/encoder.spec.ts` | NEW — minimal: type alias assignability + per-call `encode?` precedence over `flatten` in `Http` |
| `packages/functype/CLAUDE.md` | MODIFY — document Decoder, DecodeError, flatten default, 2.0.0 migration |
| `site/` | MODIFY — docs page for Decoder + wire format; 2.0.0 migration guide |
| `.changeset/<slug>.md` | NEW — major bump for `functype`; minor/patch for dependents that re-export anything |

## Reuse

- `OptionCompanion.fromJSON`, `EitherCompanion.fromJSON`, `TryCompanion.fromJSON`, `ListCompanion.fromJSON`, `MapCompanion.fromJSON`, `ObjCompanion.fromJSON` — `Decoder.tagged.*` wraps these.
- `Option.toNullable`, `Either.fold`, `List` spread, `Option.isOption` / `Either.isEither` / `Try.isTry` / `List.isList` / `Map.isMap` — `flattenFunctype` is composed from existing helpers.
- `HttpError.decodeError` — decoder failures still map to it; cause field now typed as DecodeError for the new path.
- `SerializationCompanion` — orthogonal; provides YAML/binary serialization that decoder layer does not duplicate.
- Existing recursive-ADT patterns in functype (`Either`, `Try` themselves are recursive sum types) — `DecodeError` follows the same module conventions.

## Verification

1. `pnpm -F functype test test/fetch/http.spec.ts` — assert `{age: Option(30)}` body serializes to `{"age":30}` by default; `{age: None}` → `{"age":null}`; `flatten: false` preserves tagged emission; `encode` provided overrides both (custom shape lands on the wire).
2. `pnpm -F functype test test/decoder/decoder.spec.ts` — primitives, `Decoder.option`, `Decoder.list` (multi-element failure → Composite with index paths), `Decoder.object` (multi-field failure → Composite with field paths), nested accumulation (object inside list inside object → nested Composite tree), single-failure unwrap to Leaf, `Decoder.tagged.option` round-trip.
3. `pnpm -F functype test test/decoder/encoder.spec.ts` — assert `type Encoder<A>` accepts a hand-written function, returns `JSONValue`, and Http hook precedence works (encode > flatten:false > default flatten).
4. `pnpm turbo run validate` — full workspace check.
5. Manual: small client against `httpbin.org` POSTing `{name, age: Option(30)}` and `{name, age: None}` with and without `flatten: false`; verify the echoed body matches expectations. Add one POST with a hand-rolled `encode` doing camelCase → snake_case and confirm.
6. Manual: trigger a multi-field decode failure on a real response, inspect the `DecodeError` tree shape, confirm `.format()` produces a readable nested error message.
7. Bundle-size CI job for `packages/functype/**` — confirm decoder module is within budget.
8. `validate_code` (functype MCP) after publish (against 2.0.0) to confirm the public types compile.

## What's deliberately out of scope

- **Schema-library adapter packages** (`functype-zod` etc.) — separate PRs once `Decoder` is in. Only `functype-zod` recommended; others docs-only.
- **`Encoder.object` / `Encoder.option` / `Encoder.list` etc. combinator suite.** Shipping the `Encoder<A>` type alias + per-call `encode?` hook gives the symmetry and the escape hatch; combinator parallelism mostly rubber-stamps work TypeScript already verifies on the input side. Gate on real consumer demand; grow in 2.1+ if users hand-write the same encoders enough.
- **Full bidirectional `Codec<A>`** (one schema produces both encode and decode). Real DX win only when request and response shapes mirror, which is the exception in REST. Revisit if real usage shows the demand.
- **Client-level default decoder/encoder** — per-call only for v1; add `responseDecoder?` / `requestEncoder?` on `HttpClientConfig` later if asked.
- **Streaming / chunked body decoders** — `Decoder` is value-in/value-out; streaming is a separate IO problem.
- **YAML/binary wire formats for HTTP** — `SerializationCompanion` handles these for storage; not an HTTP need.
- **DecodeError formatting / pretty-printing as a library feature beyond `format()`** — basic format only; rich rendering (colors, source spans) is a separate concern.

## Release notes outline (for changeset)

```
Major (functype 2.0.0):

BREAKING:
- `HttpRequestOptions.validate` removed. Replace with `decode: Decoder<T>` (Either-returning) or `decodeUnsafe: (raw) => T` (throw-or-pass) per call.
  - Migration: most callers `s/validate:/decodeUnsafe:/g` if they were using Zod's `.parse` or throw patterns. New code should prefer `decode:` with `Decoder.fromZod(...)` or hand-composed `Decoder.object({...})`.
- Request body auto-flattens functype ADTs to primitives (Option → nullable, List → array, etc.) by default. This fixes a latent bug where bodies containing ADTs were silently serialized in tagged `{_tag, value}` form against external APIs that don't speak functype.
  - If you were intentionally relying on the tagged emission (functype-to-functype services), pass `flatten: false` per request to preserve the old behavior, or use `Decoder.tagged.*` on the response side for round-trips.

NEW:
- `functype/decoder` module: `Decoder<A> = (raw) => Either<DecodeError, A>` with recursive `DecodeError` (Leaf | Composite) that mirrors input structure on multi-field failures.
- Primitives: `Decoder.string`, `Decoder.number`, `Decoder.boolean`, `Decoder.unknown`, `Decoder.nullable`.
- ADT decoders: `Decoder.option`, `Decoder.either.{envelope,discriminated}`, `Decoder.list`, `Decoder.array`, `Decoder.map`, `Decoder.object`.
- Tagged variants: `Decoder.tagged.option/either/try/list/map/obj` for functype-to-functype round-trips via existing `fromJSON` companions.
- `Encoder<A> = (value: A) => JSONValue` type alias (no companion combinators in this release — grow in 2.1+ if demand appears).
- `HttpRequestOptions.encode?: Encoder<TReq>` per-call hook for custom request-body transforms (Date formats, key renaming, output validation, field-stripping). Takes precedence over `flatten`.
- `HttpRequestOptions.flatten?: boolean` (default true).
```
