# Feature proposal — tag-dispatched universal deserialization

**Status:** Proposed
**Target:** functype 1.2.0 (additive minor)
**Author:** drafted with Jordan Burke (Civala / DBOS integration driver)
**Constraint honored:** functype is **dependency-free** (`dependencies: {}`, `peerDependencies: {}`). This proposal adds only JSON + tag dispatch — **no new deps**.

---

## Summary

functype 1.1.0 gave every container a **uniform serialize side** (`Serializable` → `instance.serialize().toJSON() / .toYAML() / .toBinary()`, plus `toJSON()` returning a `{ _tag, value }` envelope). The **deserialize side is fragmented**: reconstruction is via per-type companions (`Option.fromJSON`, `List.fromJSON`, `Set.fromJSON`, `Map.fromJSON`, `Obj.fromJSON`, `Stack.fromJSON`), there is **no `Either.fromJSON`**, and the top-level `fromJSON` requires the caller to pass a `reconstructor` — so it cannot reconstruct a value whose type is not known at the call site.

This proposal closes that asymmetry with two additions:

1. **`Either.fromJSON`** — fill the one missing per-type companion.
2. **A top-level tag-dispatched `deserialize(json)`** (and matching `serialize(value)`) that reads the `_tag` envelope written by `toJSON()` and reconstructs the correct functype type automatically — no `reconstructor` argument, no prior knowledge of the type.

The serialize side already round-trips uniformly; this makes the **deserialize side uniform too**, so any "I have a serialized functype value, give it back" boundary works without per-type branching.

---

## Motivation

### The concrete trigger: DBOS durable-workflow step boundaries

The Civala PDOS engine runs functype-typed code inside [DBOS](https://docs.dbos.dev) durable workflows. DBOS **JSON-serializes every workflow-step return value** for crash-safe checkpointing. A functype `Either` survives the round-trip as *data* but loses its *prototype* — the deserialized object has `{ _tag: "Left", value }` but no `.isLeft()` / `.fold()` methods. The next line in the workflow does:

```ts
const budget = await Steps.checkBudget(...)   // returns Either<BudgetExceeded, BudgetOk>
if (budget.isLeft()) { ... }                  // 💥 "Functions are not preserved through serialization"
```

DBOS exposes a `registerSerialization(recipe)` hook (`{ isApplicable, serialize, deserialize }`) and a config-level `serializer`. The recipe's `serialize` is trivial today (`v.serialize().toJSON()`). The recipe's `deserialize` is the problem: given an opaque blob, **DBOS does not know which functype type it was** — exactly the case the current per-type companions and `reconstructor`-requiring `fromJSON` cannot serve.

With a tag-dispatched `deserialize`, the entire integration is **one generic recipe**:

```ts
DBOS.registerSerialization({
  name: "functype",
  isApplicable: (v): v is Serializable<unknown> => isFunctypeValue(v),
  serialize:   (v) => v.serialize().toJSON(),   // uniform out (already exists)
  deserialize: (s) => deserialize(s),           // uniform in  (this proposal)
})
```

### Why this belongs in functype, not in each consumer

DBOS is just the first boundary. The same need arises at **any** serialize/deserialize seam: job queues, caches (Redis), RPC/message buses, durable event logs, cross-process state. Without a universal deserializer, every consumer hand-maintains a `_tag → companion` dispatch table and must update it whenever functype adds a container type. functype owns the `_tag` envelope; functype is the correct, single place to own its inverse. It also fixes a plain usability gap: *"I serialized a functype value; reconstruct it"* currently has no clean, type-agnostic answer.

---

## Current state (functype 1.1.0)

Verified against the shipped type defs:

- **Serialize (uniform):** all 12 `Serializable` types implement `serialize(): SerializationMethods<T>` with `toJSON()/toYAML()/toBinary()`, and instances carry a `toJSON()` returning `{ _tag, value }` plus `Symbol.toStringTag`.
- **Deserialize (fragmented):**
  - Present: `Option.fromJSON`, `List.fromJSON`, `Set.fromJSON`, `Map.fromJSON`, `Obj.fromJSON`, `Stack.fromJSON` (each `(json: string) => ThatType`).
  - **Missing: `Either.fromJSON`.**
  - Generic `fromJSON<T>(json, reconstructor)` exists but **requires** the caller to supply the reconstruction function — i.e. the caller must already know the type. No tag-based auto-dispatch.

So: serialize is type-agnostic; deserialize is not. This proposal removes that asymmetry.

---

## Proposed API

### 1. `Either.fromJSON`

Mirror the existing companions, so Either is no longer the odd one out:

```ts
// Either companion
fromJSON: <L, R>(json: string) => Either<L, R>
// reads { "_tag": "Left" | "Right", "value": ... } and returns Left(value) / Right(value)
```

### 2. Top-level tag-dispatched `deserialize` + `serialize`

```ts
/**
 * Serialize any functype Serializable to its JSON envelope string.
 * Thin uniform wrapper over `value.serialize().toJSON()`.
 */
export function serialize(value: Serializable<unknown>): string

/**
 * Reconstruct a functype value from a JSON envelope produced by `serialize`
 * (or any container's `toJSON()`), dispatching on the `_tag` discriminant.
 * No `reconstructor` argument required — the tag selects the companion.
 *
 * Returns `Try<unknown>`: `Success` with the reconstructed value, or `Failure`
 * for malformed JSON / an unknown tag (no throw — functype convention).
 */
export function deserialize(json: string): Try<unknown>

/** Type guard: does this value look like a functype Serializable envelope? */
export function isFunctypeValue(v: unknown): v is Serializable<unknown>
```

**Dispatch table** (envelope `_tag` → companion):

| `_tag` | Reconstructs |
|--------|--------------|
| `"Left"`, `"Right"` | `Either` |
| `"Some"`, `"None"` | `Option` |
| `"Success"`, `"Failure"` | `Try` |
| `"List"` | `List` |
| `"Set"` | `Set` |
| `"Map"` | `Map` |
| `"Stack"` | `Stack` |
| `"Tuple"` | `Tuple` |
| (extend as new `Serializable` types are added) | |

`deserialize` recurses into `value` so nested functype values (e.g. `Right(Some(List(...)))`) rebuild correctly — the inner envelopes carry their own `_tag`s.

### Return-type choice (functype convention)

`deserialize` returns **`Try<unknown>`**, not a throw, so malformed input / unknown tags are expressible values (consistent with functype's "no throwing for expected failures" rule). Callers that want a strongly-typed result narrow with the type they expect, or use the typed per-type companions when the type is known statically.

---

## Design notes / constraints

- **Dependency-free preserved.** Implementation is `JSON.parse` + a `_tag` switch over existing companions. No new runtime deps; honors `dependencies: {}` / `peerDependencies: {}`.
- **Additive / non-breaking.** New exports only; existing `fromJSON(json, reconstructor)` and the per-type companions stay. Ships as a **minor** (1.2.0).
- **Single source of truth for the envelope.** The `_tag` set and the dispatch table live next to the `Serializable` definition, so adding a future container type updates serialize and deserialize in one place (prevents the drift that per-consumer dispatch tables suffer).
- **Round-trip law (new test obligation):** for every `Serializable` type `X` and representative value `x`, `deserialize(serialize(x))` reconstructs an equal `X` with **methods intact** (`.isLeft`, `.fold`, `.map`, …). Add a parametrized conformance test across all 12 types — this is exactly the property DBOS (and every other boundary) relies on.
- **Format scope:** JSON first (the DBOS need). `toYAML`/`toBinary` already exist on the serialize side; matching tag-dispatched `deserializeYAML`/`deserializeBinary` are a natural follow-up but out of scope here.
- **Symbol.toStringTag vs `_tag`:** dispatch on `_tag` (already in the JSON payload); `Symbol.toStringTag` is for `isFunctypeValue` guarding of *live* objects (it isn't serialized).

---

## Civala-side payoff (the consumer this unblocks)

Once shipped, the PDOS DBOS fix is the single generic recipe shown above, registered in `apps/pdos-runtime` bootstrap **before `DBOS.launch()`** (DBOS throws if a serializer is registered after launch). This removes the per-type recipe boilerplate Civala would otherwise carry and re-sync on every functype release, and it future-proofs every other serialization boundary in the platform.

---

## Open questions for the functype maintainer

1. **`deserialize` return type** — `Try<unknown>` (proposed, convention-aligned) vs `Option<unknown>` vs a typed `Either<DeserializeError, unknown>`? `Try` keeps the throw captured; `Either` gives a structured error. Lean `Try`.
2. **Name** — top-level `deserialize` / `serialize`, or namespace under a `Serialization` companion (`Serialization.deserialize`) to avoid polluting the root export surface?
3. **Unknown-tag policy** — `Failure`/`Left` (proposed) vs pass-through (return the raw parsed object) so non-functype JSON survives a generic boundary untouched. For the DBOS recipe, `isApplicable` already gates entry, so strict failure is fine; a more lenient pass-through might suit other callers.
4. **Nested non-functype containers** — a plain `{ _tag: "Left", value: { _tag: "Some", value: 5 } }` rebuilds fine; confirm behavior when `value` is a plain object that merely *happens* to have a `_tag`-like field (collision risk). Consider a namespaced envelope key (e.g. `__ft_tag`) if collisions are a real concern.
