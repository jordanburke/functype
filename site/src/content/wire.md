# Wire

A serialization-boundary marker for collections crossing DB rows, HTTP bodies, JSONB payloads, and workflow inputs. Structurally identical to `ReadonlyArray<T>` — zero runtime cost, bidirectionally assignable, no casts at call sites.

## Overview

```typescript
declare const WIRE: unique symbol;

export type Wire<T> = ReadonlyArray<T> & { readonly [WIRE]?: never };
```

Wire is a **flavored** type, not a branded one — the phantom symbol is optional, so `Wire<T>` and `ReadonlyArray<T>` accept each other without ceremony. That's deliberate. The value doesn't come from type-level enforcement; it comes from three places:

- **Grep-ability.** `rg 'Wire<'` gives a complete, countable inventory of every serialization boundary in the codebase. Assert the count in CI and boundaries stop growing silently.
- **Intent at the declaration site.** `type ClaimedDoc = Wire<Row>` documents the shape at exactly one location, replacing "ReadonlyArray, but for-serialization reasons that live in a review thread."
- **ESLint pairing.** The `functype/prefer-list` rule's `TSTypeReference` handler recognizes `Array` and `ReadonlyArray` only. `Wire<T>` slips past for free, syntactically. With the rule at `allowReadonlyArrays: false`, `Wire<T>` becomes the sole explicit escape hatch and every unmarked `ReadonlyArray<T>` is a lint error.

## Import

```typescript
import type { Wire } from "functype";
// or
import type { Wire } from "functype/wire";
```

## The boundary recipe

```jsonc
// eslint.config.mjs — hold the enforcement, mark the boundaries
{
  "functype/prefer-list": ["error", { "allowReadonlyArrays": false }],
}
```

```typescript
// One declaration per boundary — grep-able, self-documenting.
type ClaimedDoc = Wire<Row>;
type ClaimedUser = Wire<UserRow>;

// Uses of the alias pass the linter (typeName is "ClaimedDoc", not "ReadonlyArray").
async function fetchDocs(): Promise<ClaimedDoc> {
  return db.query("SELECT * FROM docs").rows;
}

// Inside the pipeline, convert to List for transformation.
const active = List(await fetchDocs())
  .filter((d) => d.status === "active")
  .map(enrich);
```

## Why aliases work

The `prefer-list` rule inspects the raw type name — `TSTypeReference.typeName` — and only recognizes `Array` and `ReadonlyArray`. Every other name passes silently. So user aliases stack cleanly on `Wire<T>` (or, if you prefer, directly on `ReadonlyArray<T>` — the alias declaration itself will fire under `allowReadonlyArrays: false`, prompting a one-line fix to `Wire<T>` that every downstream use inherits).

The tradeoff: the rule can't trace transitive aliases across module boundaries. `type A = ReadonlyArray<X>` declared in a dependency, aliased locally to `B` and `C`, will pass at the use site. Type-aware linting via `@typescript-eslint`'s `ParserServices` could resolve this, but the per-file TS-program cost isn't worth it for this class of check. Explicit `Wire<T>` at your own boundaries is the intended mitigation.

## When to use

- Function signatures returning DB rows, HTTP response bodies, or any collection that will be JSON-serialized.
- Type aliases naming a serialization boundary (`type EventBatch = Wire<Event>`).
- Any collection you know will not be transformed at that boundary — it's about to be handed off, not iterated.

## When NOT to use

- Any collection you're about to `.filter` / `.map` / `.groupBy` — convert to `List<T>` first.
- Function-local variables that never cross a boundary — a `ReadonlyArray<T>` or `List<T>` is more informative.
- Method parameters where the caller might want to reuse pipeline machinery — pick `List<T>` and let the boundary marker sit at the outermost signature only.
