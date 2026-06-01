# functype 1.2.1 — serialization follow-ups (post-1.2.0 conformance review)

Companion to `universal-deserialize.md` / `universal-deserialize-changes.md`. After
1.2.0 shipped the universal codec (`Serialization.serialize` / `deserialize` /
`isFunctypeValue` + the `@functype` envelope marker, #169), it was run through a
full conformance pass by its first real consumer — civala's PDOS engine, which
nests functype values inside DBOS durable-workflow checkpoints (SuperJSON under
the hood). This doc records what that pass found.

**Headline: 1.2.0's serializer is correct and complete. There are no bugs.** All
12 `Serializable` types round-trip with methods intact, nesting recurses, the
`@functype` marker is dispatched correctly (no Effect/fp-ts collision), and
malformed input returns `Failure` instead of throwing. The three items below are
**one small enhancement (#1) and two documentation notes (#2, #3)** — none block
adoption.

---

## ✅ Conformance results (verified against published 1.2.0)

Method-preserving round-trip (`deserialize(serialize(x))` yields a live instance):

| Type | Envelope | Methods verified |
| --- | --- | --- |
| `Either` (Right/Left) | `{"@functype":"Either","_tag":"Right","value":5}` | `isRight`/`isLeft`/`fold` |
| `Option` (Some/None) | `{"@functype":"Option","_tag":"Some","value":7}` | `isEmpty`/`fold` |
| `List` | `{"@functype":"List","_tag":"List","value":[1,2,3]}` | `toArray`/`map` |
| `Set` | `{"@functype":"Set","_tag":"Set","value":[1,2]}` | dedup preserved |
| `Map` | `{"@functype":"Map","_tag":"Map","value":[["a",1]]}` | `get` |
| `Stack` | `{"@functype":"Stack","_tag":"Stack","value":[1,2]}` | `peek` |
| `Tuple` | `{"@functype":"Tuple","_tag":"Tuple","value":[1,"a"]}` | indexed access |
| `Try` (Success) | `{"@functype":"Try","_tag":"Success","value":5}` | `isSuccess` |
| `Try` (Failure) | `{"@functype":"Try","_tag":"Failure","error":{...}}` | `isFailure`/`fold` — **non-canonical `error` envelope handled** |

Plus:

- **Nesting recurses, methods at every level.** `Right(Some(List([9])))` →
  serialized as nested envelopes → deserialized with `isRight()` on the outer,
  `isEmpty` on the inner `Option`, `toArray()` on the innermost `List`. ✓
- **`@functype` marker dispatched, no collision.** A marker-less, Effect/fp-ts-shaped
  `{"_tag":"Some","value":42}` is **NOT** reconstructed as a functype `Option` —
  it passes through as the raw parsed object. The exact cross-library mis-claim
  that Change 0 set out to prevent does not occur. ✓
- **Malformed input is a typed failure, not a throw.** `deserialize("{bad")` and
  `deserialize("")` return `Failure`. ✓
- **`isFunctypeValue` is precise.** `true` for a live `Right`; `false` for a plain
  `{_tag:"Right"}` (data without methods) and for arbitrary objects. ✓

---

## #1 — Enhancement: add a structured-envelope codec for nesting inside other serializers

**Severity: enhancement (the only finding that touches integration code).**

**What.** `Serialization.serialize(value)` returns a **`string`** and
`deserialize(json)` takes a **`string`**. That is the correct contract for a
standalone JSON codec. But the driving use case for the universal deserializer —
stated in `universal-deserialize.md` — is wrapping functype values inside *another
structured serializer* (DBOS durable workflows, which use SuperJSON). In that
setting a **string return is a footgun**:

A SuperJSON custom transformer (`superjson.registerCustom`, which is exactly what
DBOS's `DBOS.registerSerialization` calls) must return **structured JSON**, not a
string. SuperJSON re-walks the transformer's output; when that output is a string
it gets **exploded character-by-character** into `{"0":"{","1":"\"","2":"_",…}`,
destroying the round-trip. Verified against `superjson@1.13.3`.

So the consumer cannot pass `Serialization.serialize` / `deserialize` directly to
the custom-transformer hook. It has to wrap them:

```ts
// civala's DBOS host recipe today — the wrap is the workaround we'd rather not own
DBOS.registerSerialization({
  name: "functype",
  isApplicable: Serialization.isFunctypeValue,
  serialize:   (v) => JSON.parse(Serialization.serialize(v)),            // string -> object
  deserialize: (o) => Serialization.deserialize(JSON.stringify(o)).orThrow(), // object -> string
})
```

That `JSON.parse(serialize(...))` / `deserialize(JSON.stringify(...))` dance is an
application-level shim for a library-shaped gap. civala is only the **first**
structured-serializer consumer; any future DBOS/queue/cache/RPC boundary hits the
same wall, so the fix belongs in functype.

**Recommended fix.** Add two thin helpers to the `Serialization` namespace that
expose the envelope as a `JSONValue` instead of a string:

```ts
/** The serialized envelope as a JSON value (parsed), for embedding inside another
 *  structured serializer (SuperJSON/DBOS custom transformers, etc.). Equivalent to
 *  JSON.parse(serialize(value)) but without the consumer round-tripping a string. */
export const toEnvelope = (value: unknown): JSONValue => JSON.parse(serialize(value))

/** Inverse of toEnvelope: reconstruct from a parsed envelope object. Equivalent to
 *  deserialize(JSON.stringify(envelope)). Returns Try (no throw), like deserialize. */
export const fromEnvelope = (envelope: JSONValue): Try<unknown> =>
  deserialize(JSON.stringify(envelope))
```

(Internally these can share the dispatch logic directly rather than literally
`JSON.parse`/`stringify` — the point is the public shape: `unknown → JSONValue`
and `JSONValue → Try<unknown>`.) `JSONValue` is the same plain-JSON type the codec
already produces; `dependencies: {}` is preserved (pure JSON, no new deps).

With these, the consumer recipe is shim-free:

```ts
DBOS.registerSerialization({
  name: "functype",
  isApplicable: Serialization.isFunctypeValue,
  serialize:   Serialization.toEnvelope,
  deserialize: (o) => Serialization.fromEnvelope(o).orThrow(),
})
```

**Test to add.** Round-trip through an actual `superjson.registerCustom` using
`toEnvelope`/`fromEnvelope` and assert methods survive on a nested value
(`Right(Some(List([…])))`) — this is the property the string API silently breaks
and the envelope API restores.

---

## #2 — Doc: make the unknown-type pass-through policy explicit

**Severity: documentation (no code change required; a strict variant is optional).**

**What.** `deserialize` resolves open question #3 ("unknown-tag policy") as
**pass-through**: any valid JSON that is not a marked functype value comes back as
`Success(rawValue)`, verbatim. Observed:

| Input | Result |
| --- | --- |
| `'{"_tag":"Some","value":42}'` (no `@functype`) | `Success({_tag:"Some",value:42})` — raw object, not rebuilt |
| `'{"hello":"world"}'` | `Success({hello:"world"})` |
| `'null'` / `'42'` / `'"x"'` / `'[1,2,3]'` | `Success(null/42/"x"/[1,2,3])` |
| `'{bad'` / `''` | `Failure` |

This is a reasonable, friendly default (a mixed boundary can deserialize freely
and only functype-marked values get rehydrated). But it is currently **undocumented
and unobservable**: `deserialize` never signals "this wasn't a functype value," so
a caller can't distinguish a passed-through `{_tag:"Some"}` from a reconstructed
functype `Option` except by inspecting the result for methods/markers.

**Recommended fix.**

1. Document it on `deserialize`: *"Valid JSON without an `@functype` marker is
   returned verbatim as `Success(value)` (pass-through); only marker-carrying
   values are reconstructed. Only malformed JSON yields `Failure`."*
2. *(Optional)* offer a strict mode for boundaries that want a hard signal — e.g.
   `deserialize(json, { strict: true })` returning `Failure` when no `@functype`
   marker is present. Not needed by civala (the `isFunctypeValue` gate covers the
   write side), but useful for RPC/queue consumers that expect functype on the
   wire.

---

## #3 — Doc/contract: `serialize` is lenient over any value

**Severity: note (no behavior change recommended).**

**What.** `serialize` succeeds on non-functype input by falling back to plain JSON:
`serialize({a:1})` → `'{"a":1}'`, `serialize(42)` → `'42'` (no `@functype` marker,
no error). So the true contract is *"serialize any value to JSON, stamping
functype values with their envelope marker,"* not *"serialize a functype value."*

This is harmless for civala (the recipe only calls `serialize` behind the
`isFunctypeValue` gate) and pairs symmetrically with the #2 pass-through on the way
back. The only ask is **contract clarity**: document that `serialize`/`deserialize`
are a *lenient JSON codec that additionally round-trips functype values*, so the
leniency is intentional rather than surprising. If a stricter "this must be a
functype value" entry point is ever wanted, it would mirror the optional strict
mode in #2.

---

## Summary / suggested 1.2.1

- [ ] **#1 (enhancement):** add `Serialization.toEnvelope(v): JSONValue` and
      `fromEnvelope(o): Try<unknown>` + a SuperJSON-nesting round-trip test. The
      one item that removes a real consumer shim.
- [ ] **#2 (doc):** document the pass-through unknown-type policy on `deserialize`;
      optionally add `{ strict: true }`.
- [ ] **#3 (doc):** document that `serialize`/`deserialize` are a lenient JSON
      codec that also round-trips functype values.

None are blocking — civala can adopt 1.2.0 today with the inline wrap from #1 and
drop it once `toEnvelope`/`fromEnvelope` ship. Dependency-free is preserved
throughout (pure JSON + `@functype` dispatch).
