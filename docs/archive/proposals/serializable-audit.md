# Serializable type audit (functype 1.1.0)

Audit for the 1.2.0 universal-deserialize proposal. Enumerates every type that
ships `serialize()`, records the `_tag` strings it emits, the envelope shape it
produces, whether the companion has `fromJSON`, and the Effect/fp-ts collision
risk.

**Source survey method:** grep for `serialize: ()` declarations in `src/`
(excluding `cli/full-interfaces.ts`, which is a doc-generator); cross-referenced
against `createSerializer` / `createCustomSerializer` callers and hand-rolled
`toJSON` sites; then verified each companion for `fromJSON` presence.

## The 12 Serializable types

| # | Type | `_tag` values | Envelope shape | `fromJSON`? | Effect/fp-ts collision |
|---|------|---------------|----------------|------------|------------------------|
| 1 | **Option** | `"Some"`, `"None"` | `{_tag, value}` (canonical) | ✓ `Option.fromJSON` | **YES** — Effect uses identical tags |
| 2 | **Either** | `"Left"`, `"Right"` | `{_tag, value}` (canonical) | ✓ `Either.fromJSON` | **YES** — Effect, fp-ts use identical |
| 3 | **Try** | `"Success"`, `"Failure"` | `Success`: `{_tag, value}` (canonical); **`Failure`: `{_tag, error, stack}` — non-canonical** | ✓ `Try.fromJSON` (handles both shapes) | **YES** — Effect Exit uses Success/Failure |
| 4 | **List** | `"List"` | `{_tag, value}` (canonical) | ✓ `List.fromJSON` | No |
| 5 | **Set** | `"Set"` | `{_tag, value}` (canonical) | ✓ `Set.fromJSON` | No |
| 6 | **Map** | `"Map"` | `{_tag, value}` (canonical, value = `[K,V][]`) | ✓ `Map.fromJSON` | No |
| 7 | **Obj** | `"Obj"` | `{_tag, value}` (canonical) | ✓ `Obj.fromJSON` | No |
| 8 | **Stack** | `"Stack"` | `{_tag, value}` (hand-rolled, canonical shape) | ✓ `Stack.fromJSON` | No |
| 9 | **Tuple** | `"Tuple"` | `{_tag, value}` (hand-rolled, canonical shape) | **✗ MISSING** | No |
| 10 | **LazyList** | `"LazyList"` | `{_tag, value}` (hand-rolled, canonical shape) | **✗ MISSING** | No |
| 11 | **Lazy** | `"Lazy"` | **`{_tag, evaluated, value?}` — non-canonical** (3 fields; `value` conditional on evaluation) | **✗ MISSING** | No |
| 12 | **Task (TaskOutcome)** | `"Ok"`, `"Err"` | `Ok`: `{_tag, value}` (canonical); **`Err`: `{_tag, error}` — non-canonical** | **✗ MISSING** | No (Rust-style names but no TS lib uses these as tags) |

## Findings

### Proposal corrections

The 1.2.0 proposal listed `Either.fromJSON` (universal-deserialize.md) and `Try.fromJSON` (universal-deserialize-changes.md) as missing. **Both already exist** as of 1.1.0:

- `Either.fromJSON` at `src/either/Either.ts:441`
- `Try.fromJSON` at `src/try/Try.ts:259` (correctly handles the asymmetric Failure shape `{_tag, error, stack}` instead of `{_tag, value}`)

Confirmed missing:
- **`Tuple.fromJSON`** (universe-deserialize-changes.md called this; correct)
- **`LazyList.fromJSON`** (proposal didn't mention; gap)
- **`Lazy.fromJSON`** (proposal didn't mention; gap — also non-canonical envelope)
- **`Task.fromJSON`** (proposal didn't mention; gap — also non-canonical for Err)

### Envelope shape is NOT uniform

Three types emit non-`{_tag, value}` envelopes today:

1. **`Try.Failure`** → `{_tag: "Failure", error: <message>, stack: <stack>}` (built via `createCustomSerializer` at `src/try/Try.ts:200`)
2. **`Lazy`** → `{_tag: "Lazy", evaluated: <bool>, value?: T}` (hand-rolled at `src/lazy/Lazy.ts:411`)
3. **`Task.Err`** → `{_tag: "Err", error: <message>}` (hand-rolled with `safeStringify` at `src/core/task/Task.ts:235`)

The proposal speaks of "the `{_tag, value}` envelope" as if it were universal — it isn't. A universal `deserialize` must delegate to each companion's `fromJSON` (which knows its own shape), NOT pattern-match on a presumed `value` field.

**Implication for Change 2 (top-level `deserialize`):** the dispatch table is `@functype → companion.fromJSON`, where `companion.fromJSON` is the only authoritative reader. A central "parse `value`, then call companion" rewrite is wrong; per-type companion ownership of the shape is correct.

### Bypassed central factory

7 of 12 types use `createSerializer` from `SerializationCompanion.ts`. The other 5 hand-roll their `toJSON` (Lazy, LazyList, Stack, Tuple, Task) or use `createCustomSerializer` (Try.Failure).

**Implication for Change 0 (`@functype` marker):** adding the marker to `createSerializer` would only cover ~7 of 12. **Each hand-rolled site must be updated independently.** The hand-rolled sites to touch:

- `src/lazy/Lazy.ts:411–425` (toJSON + toYAML + toBinary)
- `src/list/LazyList.ts:352–354`
- `src/stack/Stack.ts:255–257`
- `src/tuple/Tuple.ts:97–99`
- `src/core/task/Task.ts:235–238` and `355–357`
- `src/try/Try.ts:200` (Try.Failure via `createCustomSerializer` — also needs marker)

**Recommendation:** route hand-rolled toJSONs through `createSerializer` or a new `createTaggedSerializer` helper that centralizes the `@functype` marker, so the next new Serializable can't accidentally bypass it. The five hand-rolled sites are bypassing the helper because they emit non-canonical shapes — those need a richer helper signature like `createSerializer(tag, fields: Record<string, unknown>)` that always stamps `@functype` regardless of payload shape.

### Effect/fp-ts collision — confirmed real

All three primary ADTs (Option, Either, Try) collide on `_tag` strings with Effect, and Either/Right/Left also with fp-ts. This is exactly the case Change 0 was designed to defend against. The audit confirms it's not theoretical: a bare-`_tag` dispatcher receiving `{_tag: "Some", value: 30}` cannot tell whether it came from a functype `Option` or an Effect `Option`. The `@functype` marker is mandatory.

The other 9 types (List, Set, Map, Obj, Stack, Tuple, LazyList, Lazy, Task) use functype-specific tag names and don't have a documented Effect/fp-ts collision, but the marker still applies uniformly so the dispatch logic is one rule, not a sometimes-stripped/sometimes-kept exception.

## Dispatch table for Change 2

The complete `@functype → companion.fromJSON` table:

| `@functype` | companion fromJSON | inner `_tag` variants |
|-------------|-------------------|----------------------|
| `Option` | `Option.fromJSON` | `Some` / `None` |
| `Either` | `Either.fromJSON` | `Left` / `Right` |
| `Try` | `Try.fromJSON` | `Success` / `Failure` (asymmetric shape) |
| `List` | `List.fromJSON` | — |
| `Set` | `Set.fromJSON` | — |
| `Map` | `Map.fromJSON` | — |
| `Obj` | `Obj.fromJSON` | — |
| `Stack` | `Stack.fromJSON` | — |
| `Tuple` | **NEW: `Tuple.fromJSON`** | — |
| `LazyList` | **NEW: `LazyList.fromJSON`** | — |
| `Lazy` | **NEW: `Lazy.fromJSON`** (must handle `evaluated` field) | — |
| `Task` | **NEW: `Task.fromJSON`** (asymmetric Err shape) | `Ok` / `Err` |

## Updated Change 1 work list

Per the audit, **Change 1 must add four missing `fromJSON` companions** (not the one or two the proposal originally listed):

1. `Tuple.fromJSON` — straightforward `{_tag, value}` reader
2. `LazyList.fromJSON` — straightforward `{_tag, value}` reader; rebuilds via `LazyList(value)`
3. `Lazy.fromJSON` — non-canonical: parse `{_tag, evaluated, value?}`; reconstruct as already-evaluated `Lazy.of(value)` if `evaluated: true`, or as a `Lazy` of a thunk that throws "not evaluated" if `false` (open design call — see below)
4. `Task.fromJSON` — non-canonical: parse `{_tag, value}` for Ok or `{_tag, error}` for Err; reconstruct via `Task.ok(value)` / `Task.err(new Error(error))`

## New open design questions surfaced by the audit

1. **Lazy round-trip semantics.** A serialized unevaluated `Lazy` carries no thunk. On deserialize, the choices are:
   - (a) Reconstruct as an already-failed Lazy whose `value()` throws "Lazy was serialized before evaluation"
   - (b) Reconstruct as a Lazy holding `undefined` (data lost, no error signal)
   - (c) Refuse to deserialize an unevaluated Lazy (`fromJSON` returns Failure, universal `deserialize` propagates it)

   Lean (c) — `Lazy` is fundamentally a thunk; preserving its semantics through serialization isn't possible without the thunk itself. Strict failure is honest.

2. **Task round-trip — the same question for the throwable carried by Err.** Today the Err envelope only carries `error: <message string>`, losing the original Error class, name, cause chain, and stack. `Task.fromJSON` will reconstruct as `new Error(message)` — a plain Error, not whatever subclass was originally thrown. **Document this as an explicit semantic limitation; do not pretend round-trip is lossless.** (Try.fromJSON does preserve `stack`; Task.Err's envelope doesn't even include stack — consider adding it for parity.)

3. **`createCustomSerializer` callers.** Try.Failure is the only current caller of `createCustomSerializer`. If Change 0 routes all sites through `createSerializer` with a richer signature, `createCustomSerializer` may become unused — flag for removal in 1.2.0 (or in a follow-up 1.3.0).

## Summary checklist update

Augmenting the proposal's Summary checklist:

- [x] **Audit complete** — 12 types enumerated, 4 missing `fromJSON` confirmed (Tuple, LazyList, Lazy, Task), 3 non-canonical envelopes documented (Try.Failure, Lazy, Task.Err), 3 ADTs confirmed colliding with Effect (Option, Either, Try).
- [ ] **Change 0 expanded scope** — `@functype` marker must touch:
  - `src/serialization/SerializationCompanion.ts` (`createSerializer` + `createCustomSerializer`)
  - 5 hand-rolled toJSON sites: Lazy, LazyList, Stack, Tuple, Task (both Ok and Err)
  - Consider replacing `createCustomSerializer` with a unified helper to prevent future bypass
- [ ] Change 1: add `Tuple.fromJSON`, `LazyList.fromJSON`, `Lazy.fromJSON`, `Task.fromJSON`. (Either.fromJSON and Try.fromJSON already exist — proposal claim was wrong.)
- [ ] Change 2: top-level `Serialization.{serialize, deserialize, isFunctypeValue}` dispatching on `@functype` marker (table above).
- [ ] Change 3: parametrized round-trip across all 12 types + nested + malformed + Effect-collision sentinel test (`{_tag: "Some"}` without marker must not be claimed).
- [ ] New open questions: Lazy unevaluated semantics; Task error fidelity; deprecate `createCustomSerializer`.
