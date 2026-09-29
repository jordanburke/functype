# Wire

A serialization-boundary marker for values crossing DB rows, HTTP bodies, JSONB payloads and workflow inputs. It wraps any boundary shape: a collection, a nullable field, or a whole row type. Zero runtime cost, assignable both ways with the plain type, no casts at call sites.

## Overview

```typescript
declare const WIRE: unique symbol;
export interface WireMark {
  readonly [WIRE]?: never;
}

export type Wire<T> = T | (T & WireMark);
```

Wire is a **flavored** type, not a branded one. The plain `T` member means `Wire<T>` and `T` accept each other without ceremony, including `null`, `undefined` and `unknown`, so generic helpers like `findOne<R>(): Promise<Wire<R | null>>` compile. `null` is exactly the shape that survives `JSON.stringify`.

The `T & WireMark` member is there for naming, not safety. It keeps TypeScript from resolving the alias away, so inferred exports emit `Wire<Row>` in `.d.ts` files and hovers.

The value doesn't come from type-level enforcement. It comes from three places:

- **Grep-ability.** `rg 'Wire<'` is a complete, countable inventory of every serialization boundary in the codebase.
- **Intent at the declaration site.** `type UserRow = Wire<{ … }>` states the boundary in exactly one place.
- **ESLint pairing.** `functype/prefer-list` and `functype/prefer-option` skip everything inside a `Wire<…>` type argument. A `ReadonlyArray` or a `T | null` there is the declared wire shape, not a missed `List` or `Option`.

## Import

```typescript
import type { Wire } from "functype";
// or
import type { Wire } from "functype/wire";
```

## The three shapes

```typescript
// A whole row or DTO: every field inside is covered.
type UserRow = Wire<{
  readonly id: string;
  readonly email: string | null;
  readonly tags: ReadonlyArray<string>;
}>;

// A collection.
type UserRows = Wire<ReadonlyArray<UserRow>>;

// A single field on an otherwise domain-shaped type.
type Invite = {
  readonly id: InviteId;
  readonly acceptedAt: Wire<string | null>;
};
```

## The boundary recipe

```jsonc
// eslint.config.mjs — hold the enforcement, mark the boundaries
{
  "functype/prefer-list": ["error", { "allowReadonlyArrays": false }],
  "functype/prefer-option": "warn", // "error" once your boundary types are wired
}
```

```typescript
// Declare the boundary once.
async function fetchUsers(): Promise<UserRows> {
  return db.query("SELECT * FROM users").rows;
}

// Inside the pipeline, convert to List and Option for transformation.
const reachable = List(await fetchUsers())
  .filter((u) => Option(u.email).isSome())
  .map(enrich);
```

## Rule options

Both rules take `wireTypes` (default `["Wire"]`). Add your own boundary alias name if you have one, or pass `[]` to turn the exemption off. Qualified references (`functype.Wire<…>`) are recognized.

## Migrating from 1.9

In 1.9, `Wire<T>` meant `ReadonlyArray<T>`. In 1.10 it wraps any shape, so:

```typescript
type ClaimedDocs = Wire<Row>; // 1.9: an array of Row
type ClaimedDocs = Wire<ReadonlyArray<Row>>; // 1.10
```

The break is loud, not silent: a `Wire<Row>` that meant an array fails to compile at the first `.map` or array assignment. The two exceptions are `Wire<object>` and `Wire<any>`, which accept an array under either meaning; search for them when upgrading.

## When to use

- Types for DB rows, HTTP request and response bodies, JSONB payloads, queue and workflow inputs.
- Function signatures that return or accept those shapes at the edge of the system.

## When NOT to use

- Values you're about to transform. Convert to `List<T>` / `Option<T>` first.
- Function-local variables that never cross a boundary.
