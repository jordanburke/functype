# Q1 (Lazy) + Q2 (Task/Try error fidelity) — design resolutions

Follow-up to `serializable-audit.md`. Resolves the two open design questions the
audit surfaced. Both are **envelope-format decisions** and bundle with Change 0
(the `@functype` marker) since 1.2.0 is the cheap window for envelope changes —
1.1.0 just shipped and almost no data is persisted under the current shapes.

---

## Q1 — Lazy round-trip semantics

### The problem

A `Lazy` is a thunk. After serialization, the thunk is gone. Today's envelope:

```ts
// src/lazy/Lazy.ts:411
{ _tag: "Lazy", evaluated: true,  value: <T> }   // forced
{ _tag: "Lazy", evaluated: false }                // unevaluated — no value
```

The unevaluated-post-serialize case has no good answer at deserialize time: you can't recreate a closure from JSON. The audit listed three handling options ((a) Lazy that throws on access, (b) Lazy of undefined, (c) refuse to deserialize). All three try to fix the problem at the wrong end.

### The decision: **force on serialize**

`Lazy.serialize().toJSON()` evaluates the thunk before emitting. The unevaluated-after-serialize state is eliminated entirely; the envelope becomes canonical `{_tag, value}` like every other Serializable.

```ts
// New envelope (1.2.0):
{ "@functype": "Lazy", "_tag": "Lazy", "value": <T> }                 // thunk succeeded
{ "@functype": "Lazy", "_tag": "Lazy", "error": <SerializedError> }   // thunk threw — see Q2 for shape
```

Reasoning:
- **No fundamentally lossy state.** You can always recover `value` (or the failure that occurred when computing it). The post-deserialize Lazy is semantically equivalent to "already-forced Lazy" — the only Lazy a deserialized one can ever be.
- **Eliminates the bad envelope.** No `evaluated: false` to handle; no thunk-rebuild trickery; no "throws on access" reconstruction.
- **Aligns with Scala precedent.** Scala's `lazy val` field on a `Serializable` class behaves identically — serialization forces the lazy val. functype-Lazy in a wire format should match.

### The trade-off being accepted

**Serialize now has the side effect of forcing the thunk.** A previously-deferred computation runs at `toJSON()` time. This is a behavior change that callers must understand.

It is the *correct* trade-off because the alternative is "serialize succeeds but produces data that can't reconstruct the Lazy" — i.e. silent loss. Forcing is loud (side effects are visible) and complete (data survives).

If forcing throws: the envelope captures the failure via the shared `SerializedError` (Q2). On deserialize, the reconstructed Lazy throws the same failure on `value()` access — semantically identical to a Lazy whose first force threw.

Document prominently in `src/lazy/Lazy.ts` and the migration notes.

### `Lazy.fromJSON` (new)

```ts
Lazy.fromJSON: <T>(json: string): Lazy<T> => {
  const parsed = JSON.parse(json) as
    | { "@functype": "Lazy"; _tag: "Lazy"; value: T }
    | { "@functype": "Lazy"; _tag: "Lazy"; error: SerializedError }
  if ("error" in parsed) {
    const err = deserializeError(parsed.error)
    return Lazy.of<T>(() => { throw err })   // reconstructs the failure semantics
  }
  return Lazy.evaluated(parsed.value as T)   // need an "already-forced" constructor — see below
}
```

**Companion gap to fix as part of this change:** `Lazy` today has no constructor for "already-evaluated, no thunk to run." `Lazy.of(value)` takes a thunk. Add `Lazy.evaluated<T>(value: T): Lazy<T>` (or reuse `Lazy.of(() => value)` — slightly wasteful but works without API growth). Recommend the explicit `Lazy.evaluated` for clarity.

### What `Lazy.toValue()` should do

`toValue()` is the in-memory mirror of `toJSON()`. Today it returns `{_tag, evaluated, value?}` and does not force. With the serialize-side change, two paths:

- **Mirror the serialize change:** `toValue()` also forces. Cleaner symmetry; same trade-off applies (visible side effect).
- **Keep `toValue` non-forcing:** distinguishes in-memory inspection (no side effect) from serialization (side effect). The envelope and `toValue` shapes diverge.

Lean **mirror the serialize change**. The whole point of the decision is that "Lazy without a thunk" isn't a useful shape. `toValue` should produce the same canonical projection serialize does.

---

## Q2 — Task and Try error fidelity

### The problem

Two Serializable types carry an `Error` in their failure branch and lose information differently:

| Type | Current envelope (failure branch) | Loses |
|------|----------------------------------|-------|
| `Try.Failure` (`Try.ts:200`) | `{_tag: "Failure", error: <message>, stack: <stack>}` | `name` (subclass discriminator), `cause` chain |
| `Task.Err` (`Task.ts:235`) | `{_tag: "Err", error: <message>}` | `name`, `stack`, `cause` |

The two are asymmetric for no reason — both are "tagged failure carrying an Error" and should share the same error projection. And both lose the discriminator (`err.name`) and the cause chain — the two pieces of identity that *can* survive JSON serialization.

### The decision: shared `SerializedError` shape + helper

Introduce a canonical projection of `Error` to JSON, used by every Serializable that carries an `Error` in its failure branch. New file `src/serialization/error-envelope.ts`:

```ts
export type SerializedError = {
  readonly name: string                                    // err.name — "TypeError" etc.
  readonly message: string                                 // err.message
  readonly stack?: string                                  // err.stack
  readonly cause?: SerializedError | string                // recursive; string fallback for non-Error causes
}

export const serializeError = (err: unknown): SerializedError => {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      ...(err.stack !== undefined && { stack: err.stack }),
      ...(err.cause !== undefined && { cause: serializeError(err.cause) }),
    }
  }
  // Non-Error thrown value (string, object, anything). Capture what we can.
  return {
    name: "NonErrorThrowable",
    message: typeof err === "string" ? err : safeStringify(err) ?? "<unserializable>",
  }
}

export const deserializeError = (s: SerializedError | string): Error => {
  if (typeof s === "string") return new Error(s)
  const e = new Error(s.message)
  e.name = s.name
  if (s.stack !== undefined) e.stack = s.stack
  if (s.cause !== undefined) {
    // Error.cause is allowed any value but we round-trip via SerializedError
    ;(e as Error & { cause?: unknown }).cause = deserializeError(s.cause)
  }
  return e
}
```

### New envelopes

```ts
// Try.Failure (1.2.0):
{ "@functype": "Try", "_tag": "Failure", "error": SerializedError }

// Task.Err (1.2.0):
{ "@functype": "Task", "_tag": "Err",     "error": SerializedError }

// Lazy (1.2.0, failure case — see Q1):
{ "@functype": "Lazy", "_tag": "Lazy",    "error": SerializedError }
```

Three types, one shape for the failure carrier. Symmetric.

### What survives round-trip

| Property | Survives? | Notes |
|----------|-----------|-------|
| `err.message` | ✓ | Always |
| `err.stack` | ✓ | If present at serialize time |
| `err.name` | ✓ | Preserves discriminator: `e.name === "TypeError"` works after round-trip |
| `err.cause` chain | ✓ | Recursive serialization; arbitrary nesting depth |
| `instanceof TypeError` (and other subclass checks) | ✗ | JSON can't reconstruct user-defined classes |
| Custom Error subclass fields (e.g. `HttpError.status`) | ✗ | Generic projection doesn't know about them |

**The honest framing:** the reconstructed Error is a *plain Error* with `name`, `message`, `stack`, and `cause` set. Code that does `e.name === "TypeError"` survives. Code that does `e instanceof TypeError` does not. Document this explicitly in the migration notes and the JSDoc on `serializeError`.

### Custom Error subclass extensibility (deferred)

For custom Error subclasses with extra fields (`HttpError`, `ValidationError`), a future addition could be a registry — `Serialization.registerError(name, deserializer)` so user code can plug in subclass reconstruction. **Out of scope for 1.2.0.** Note in the doc as future work. The plain-Error round-trip is enough for the DBOS use case and the 90% case.

### Why this isn't backwards-compatible

Today's Try.Failure envelope has `error: <string>`. Proposed has `error: <SerializedError>`. Any external code reading `parsed.error` and expecting a string breaks.

Mitigation: bundle with Change 0. Same justification — 1.1.0 just shipped, almost no persisted data exists, envelope changes are a 1.2.0 minor's earned scope. Don't try to dual-read both shapes; that's the migration pattern of a 2.0 or later, when persisted data exists.

### Updated companions

```ts
Try.fromJSON: <T>(json: string): Try<T> => {
  const parsed = JSON.parse(json)
  if (parsed["@functype"] !== "Try") throw new Error(`Expected @functype=Try, got ${parsed["@functype"]}`)
  if (parsed._tag === "Success") return Success<T>(parsed.value as T)
  return Failure<T>(deserializeError(parsed.error))
}

Task.fromJSON: <T>(json: string): TaskOutcome<T> => {
  const parsed = JSON.parse(json)
  if (parsed["@functype"] !== "Task") throw new Error(`Expected @functype=Task, got ${parsed["@functype"]}`)
  if (parsed._tag === "Ok") return Task.ok(parsed.value as T)
  return Task.err(deserializeError(parsed.error))
}
```

Both go through the same helper. If we later add Error-subclass reconstruction, ONE function changes and both companions benefit.

---

## Updated 1.2.0 work list

Folding Q1 + Q2 resolutions into the existing checklist:

- [ ] **Change 0 (envelope marker) — expanded scope:**
  - Add `@functype` to every Serializable's envelope via `createSerializer` (covers 7 of 12) + 5 hand-rolled sites (Lazy, LazyList, Stack, Tuple, Task) + 1 `createCustomSerializer` site (Try.Failure).
  - **New `src/serialization/error-envelope.ts`** with `SerializedError`, `serializeError`, `deserializeError`. Used by Try.Failure, Task.Err, Lazy (failure case).
  - **Lazy semantics change:** `Lazy.serialize().toJSON()` forces the thunk. New envelope: `{_tag, value}` on success, `{_tag, error: SerializedError}` on thunk failure. No more `evaluated: false` envelope.
  - Add `Lazy.evaluated<T>(value: T): Lazy<T>` constructor (or document the `Lazy.of(() => value)` workaround).
  - Mirror the Lazy serialize change in `Lazy.toValue()` (force on call).

- [ ] **Change 1 (missing companions) — expanded:**
  - `Tuple.fromJSON`
  - `LazyList.fromJSON`
  - `Lazy.fromJSON` (handles forced-success + thunk-failure envelopes)
  - `Task.fromJSON` (handles Ok + Err via `deserializeError`)
  - Update existing `Try.fromJSON` to read `SerializedError` instead of `{error, stack}`.

- [ ] **Change 2:** top-level `Serialization.{serialize, deserialize, isFunctypeValue}` dispatching on `@functype`. Dispatch table is the audit's 12-row table.

- [ ] **Change 3:** parametrized round-trip across all 12 types + nested + malformed + Effect-collision sentinel + **new test cases**:
  - Lazy thunk-success and thunk-failure round-trips
  - Try.Failure with `cause: TypeError("inner")` — verify `e.name === "TypeError"` and `e.cause` chain reconstructed
  - Task.Err with stack preserved
  - Non-Error throwable (`Failure("string")`) projected via `NonErrorThrowable` shape

- [ ] **Migration notes** (in CHANGELOG `## Unreleased`):
  - Lazy envelope changed; serialize now forces the thunk (side effect to be aware of).
  - Try.Failure / Task.Err envelopes now carry a structured `SerializedError` object instead of bare string fields.
  - Reconstructed Errors have `name/message/stack/cause` but not `instanceof Class` — subclass identity does not round-trip (registry mechanism deferred).

- [ ] **Deferred to a later release** (document in `serializable-audit.md` future-work section):
  - Custom Error subclass deserialization registry.
  - `createCustomSerializer` deprecation/removal (single caller, Try.Failure, now goes through `createSerializer` + `serializeError`).

---

## Open questions remaining

The three NOT-yet-decided open questions from `universal-deserialize-changes.md` are still on the table:

1. `deserialize` return type → leaning **`Try<unknown>`** (convention-aligned).
2. Export surface → leaning **`Serialization` namespace** (`Serialization.deserialize`).
3. Unknown-marker policy → leaning **strict `Failure`** (host recipes already gate with `isApplicable`).

These are pure code choices — decide at implementation time. None are bytes-on-disk like Q1 and Q2 were.
