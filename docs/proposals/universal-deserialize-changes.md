# functype 1.2.0 — universal deserialization: what changes and why

Companion to `universal-deserialize.md` (the proposal). This is the concrete
change-list. **Constraint:** functype is dependency-free (`dependencies: {}`,
`peerDependencies: {}`) — every change below is `JSON.parse` + a `_tag` switch
over code that already exists. No new deps. Additive minor (1.2.0).

> Decision recorded: functype's serialization stays **serializer-agnostic** — it
> knows only its own types + JSON. It must NOT learn about SuperJSON, DBOS, or any
> host serializer. Those integrations wrap functype's generic codec from the
> outside (e.g. a DBOS `registerSerialization` recipe lives in the *consumer*, not
> here). This proposal exists precisely so that wrapper can be ~8 lines instead of
> a hand-maintained per-type dispatch table.

---

## The gap being closed (verified against shipped 1.1.0 type defs)

- **Serialize side is uniform:** all 12 `Serializable` types implement
  `serialize(): SerializationMethods<T>` (`toJSON()/toYAML()/toBinary()`), and
  instances expose `toJSON()` returning a `{ _tag, value }` envelope.
- **Deserialize side is fragmented:**
  - Present per-type companions: `Option.fromJSON`, `List.fromJSON`,
    `Set.fromJSON`, `Map.fromJSON`, `Obj.fromJSON`, `Stack.fromJSON`.
  - **Missing:** `Either.fromJSON`, `Try.fromJSON`, `Tuple.fromJSON` (any
    `Serializable` type lacking a companion).
  - Top-level `fromJSON<T>(json, reconstructor)` requires the caller to pass the
    reconstruction fn — so it cannot rebuild a value whose type is unknown at the
    call site. There is **no tag-dispatched deserializer.**

Net: serialize is type-agnostic, deserialize is not. Close that asymmetry.

---

## Change 0 — add a `@functype` marker to the serialized envelope (DECIDED; do this first)

**Why this is Change 0 (a prerequisite, and the one irreversible decision):** the
envelope is what gets **persisted** (DBOS stores serialized step results in
Postgres; durable workflows are long-lived). Once data is written under an envelope
format, changing it requires migrating stored rows. 1.1.0 only just shipped the
`{ _tag, value }` envelope, so little/no data exists under it yet — this is the
**cheap moment** to fix the format; later it's a migration. The other open
questions are code choices and can flex; this one is bytes-on-disk.

**The problem with bare `_tag`:** `_tag` values are NOT functype-unique. Effect and
fp-ts — the ecosystem functype lives in and interops with — use the **same tag
strings**: `Some`/`None`, `Left`/`Right`, `Success`/`Failure`. A root-level
`deserialize` that dispatches on `_tag` alone would mistake an Effect `Option` for
a functype `Option` and silently rebuild it as the wrong library's type. This is
not a hypothetical field-name clash; it's a whole popular library with identical
envelopes.

**The decision:** `toJSON()` (and the rest of the serialize side) emits a
namespaced marker carrying the concrete type:

```jsonc
// before (1.1.0):
{ "_tag": "Right", "value": 5 }
// after (1.2.0):
{ "@functype": "Either", "_tag": "Right", "value": 5 }
```

- **`@functype`** = "this is a functype value" + which type → `deserialize`
  dispatches on it directly (no tag→type inference table).
- **`_tag`** is **kept** (`"Right"`/`"Left"`) for variant discrimination and
  ergonomic/back-compat reads; it's just no longer the dispatch key.
- A value **without** `@functype` is "not ours" → `deserialize` applies the
  unknown-type policy (Failure / pass-through, per open question #3) and never
  mis-claims foreign data.

**Precedent (this is the industry-standard move):** SuperJSON tags its output;
DBOS adds `__dbos_serializer: "superjson"` with the explicit comment *"to avoid ANY
ambiguity with user data."* A serialization layer that persists data does not trust
structural tags — it stamps its own namespaced marker. functype should too.

**Scope:** touches every `Serializable` type's `toJSON()`/serialize output to add
the marker. Additive to the JSON shape (`_tag`/`value` unchanged), but it IS an
envelope-format change — hence 1.2.0, decided now.

---

## Change 1 — add the missing per-type `fromJSON` companions

**Why:** every `Serializable` type should be reconstructable on its own, and the
universal deserializer (Change 2) dispatches to these. Today `Either` (and any
other gap) forces callers to hand-roll the rebuild.

**What:** add `fromJSON` to each companion that lacks it, mirroring the existing
ones (`Option.fromJSON`, `List.fromJSON`). At minimum:

```ts
// Either companion
Either.fromJSON: <L, R>(json: string) => Either<L, R>
//   parse → { _tag: "Left" | "Right", value } → Left(value) / Right(value)

// Try companion (if absent)
Try.fromJSON: <T>(json: string) => Try<T>
//   { _tag: "Success" | "Failure", value } → Success / Failure

// Tuple companion (if absent) — parallels the others
```

**Audit obligation:** enumerate the 12 `Serializable` types; add `fromJSON` to any
without one. The dispatch table in Change 2 must cover exactly this set.

**Why it's safe:** purely additive new companion methods; no existing signature
changes.

---

## Change 2 — add a top-level tag-dispatched `deserialize` (the keystone)

**Why:** this is the actual missing capability. A serializer boundary (DBOS,
queue, cache, RPC) holds an opaque string and does NOT know which functype type
it was. It needs "give me back whatever functype value this was" with no type
argument. Nothing in 1.1.0 provides that.

**What:** three new top-level exports. Dispatch keys on the **`@functype`
envelope marker** (Change 0), NOT bare `_tag` — see Change 0 for why.

```ts
/** Serialize any functype Serializable to its JSON envelope string.
 *  Thin uniform wrapper over value.serialize().toJSON() (which now emits @functype). */
export function serialize(value: Serializable<unknown>): string

/** Reconstruct a functype value from a JSON envelope, dispatching on the
 *  `@functype` marker. No reconstructor argument. Returns Try (no throw —
 *  functype convention): Success(value) | Failure for malformed JSON, missing
 *  marker, or unknown type. */
export function deserialize(json: string): Try<unknown>

/** Type guard: is this a live functype Serializable? (used by host recipes'
 *  isApplicable). Checks Symbol.toStringTag / presence of serialize + _tag. */
export function isFunctypeValue(v: unknown): v is Serializable<unknown>
```

**Dispatch table** (`@functype` marker → companion `fromJSON`; `_tag` then selects
the variant *inside* that type, e.g. `Right` vs `Left`):

| `@functype` | → | variant via `_tag` |
|-------------|---|--------------------|
| `Either` | `Either.fromJSON` | `Left` / `Right` |
| `Option` | `Option.fromJSON` | `Some` / `None` |
| `Try` | `Try.fromJSON` | `Success` / `Failure` |
| `List` | `List.fromJSON` | — |
| `Set` | `Set.fromJSON` | — |
| `Map` | `Map.fromJSON` | — |
| `Stack` | `Stack.fromJSON` | — |
| `Tuple` | `Tuple.fromJSON` | — |
| `Obj` | `Obj.fromJSON` | — |
| (add as new `Serializable` types ship) | | |

**Why marker-dispatch beats tag-dispatch:** `_tag` values are NOT functype-unique —
Effect and fp-ts use the *same* strings (`Some`/`None`, `Left`/`Right`,
`Success`/`Failure`). A bare-`_tag` `deserialize` would silently rebuild an Effect
`Option` as a functype `Option`. The `@functype` marker makes the value
unambiguously functype's; anything without the marker is "not ours" → unknown-type
policy applies. (This is the same defense SuperJSON and DBOS use — DBOS adds
`__dbos_serializer: "superjson"` explicitly *"to avoid ANY ambiguity with user
data."*)

**Recursion:** `deserialize` recurses into `value` so nested functype values
(`Right(Some(List(...)))`) rebuild fully — each inner envelope carries its own
`@functype` marker.

**Why it's safe:** new exports only; existing `fromJSON(json, reconstructor)` and
per-type companions are untouched.

---

## Change 3 — the round-trip conformance test (the real guarantee)

**Why:** the property every consumer depends on is not "data survives" but
"**methods survive**" — `deserialize(serialize(x))` must yield a value where
`.isLeft()`, `.fold()`, `.map()`, etc. work. This is exactly what DBOS's failure
mode ("Functions are not preserved through serialization") is about. Without this
test the feature can silently regress.

**What:** a parametrized test across all 12 `Serializable` types:

```ts
for each Serializable type X with representative value x:
  const round = deserialize(serialize(x)).orThrow()
  assert round deep-equals x in DATA
  assert round has working METHODS (call the type's discriminant + fold/map)
  // e.g. Either: round.isLeft() === x.isLeft(); round.fold(l,r) === x.fold(l,r)
```

Plus nested cases (`Right(Some(5))`, `List([Some(1), None])`) and malformed input
(`deserialize("{bad") → Failure`, unknown `_tag` → Failure).

---

## Open design decisions (maintainer's call — flagged, not decided here)

1. **`deserialize` return type.** Proposed `Try<unknown>` (captures the throw,
   convention-aligned). Alternatives: `Option<unknown>` (loses the error) or
   `Either<DeserializeError, unknown>` (structured error). Lean `Try`.

2. **Export surface.** Root-level `serialize`/`deserialize` vs a `Serialization`
   companion namespace (`Serialization.deserialize`) to avoid widening the root
   barrel. The root already exports `fromJSON`, `fromYAML`, `fromBinary`,
   `createSerializer` — so root is consistent, but the names are generic.

3. **Unknown-`_tag` policy.** Proposed: `Failure`. Alternative: pass-through
   (return the raw parsed object) so non-functype JSON survives a generic
   boundary. For host recipes `isApplicable` gates entry, so strict failure is
   safe; pass-through is friendlier for direct callers. Pick one explicitly.

4. **~~`_tag` collision risk.~~ DECIDED → see Change 0.** Resolved by adding the
   `@functype` envelope marker and dispatching on it (not bare `_tag`). Driven by
   Effect/fp-ts using identical `_tag` strings (`Some`/`None`, `Left`/`Right`,
   `Success`/`Failure`), so a marker is required to avoid silent cross-library
   mis-reconstruction. This is the only open question that had to be settled in
   1.2.0 (it's the persisted envelope format); the three above are code choices
   that can flex.

---

## What this unblocks downstream (context, not a functype concern)

Civala's PDOS engine runs functype-typed code inside DBOS durable workflows; DBOS
(via SuperJSON) strips functype prototypes at step boundaries. With Changes 1–2,
the entire civala-side fix is one host recipe wrapping `isFunctypeValue` +
`serialize` + `deserialize` — no per-type maintenance, and functype stays
serializer-agnostic. Same shape serves any future SuperJSON/queue/cache/RPC
boundary, for any functype user.

---

## Summary checklist

- [ ] **Change 0 (DECIDED, do first):** add the `@functype` marker to every
      `Serializable` type's `toJSON()`/serialize output (`{ "@functype": "Either",
      "_tag": "Right", "value": … }`). Envelope-format change — must land in 1.2.0.
- [ ] Change 1: add `Either.fromJSON` (+ `Try`, `Tuple`, any other `Serializable`
      gap; audit all 12).
- [ ] Change 2: add top-level `serialize`, `deserialize` (dispatches on
      `@functype`, returns `Try`), `isFunctypeValue`; recurse into nested envelopes.
- [ ] Change 3: parametrized round-trip conformance test (data **and** methods) +
      nested + malformed + Effect-collision (`{_tag:"Some"}` without `@functype`
      must NOT be claimed) cases.
- [ ] Decide the 3 remaining open questions (return type, export surface,
      unknown-type policy). #4 (envelope marker) is DECIDED → Change 0.
- [ ] Release 1.2.0; bump civala workspace; civala adds the one host recipe.
