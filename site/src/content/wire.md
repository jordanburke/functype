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
```

or

```typescript
import type { Wire } from "functype/wire";
```

## The three shapes

```typescript
import type { Wire } from "functype";

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
import type { Wire } from "functype";

// 1.9 wrote this as Wire<Row>, which meant an array of Row
type ClaimedDocs = Wire<ReadonlyArray<Row>>; // 1.10+
```

The break is loud, not silent: a `Wire<Row>` that meant an array fails to compile at the first `.map` or array assignment. The two exceptions are `Wire<object>` and `Wire<any>`, which accept an array under either meaning; search for them when upgrading.

## When to use

- Types for DB rows, HTTP request and response bodies, JSONB payloads, queue and workflow inputs.
- Function signatures that return or accept those shapes at the edge of the system.

## When NOT to use

- Values you're about to transform. Convert to `List<T>` / `Option<T>` first.
- Function-local variables that never cross a boundary.

## Wire or Option?

Ask who reads the absence.

- **Use `Option` when your own code reads it.** You branch on it, map it, or return it to code that does.
- **Use `Wire` when something outside your code reads it, or when the absence is part of the format.** That reader is a serializer, a driver, a schema library or a host API.
- **Convert once, at the edge.** The first function that receives a `Wire` value turns it into `Option` if later code decides anything from it.

### Where Wire is the answer

**Serialized shapes.** `Option` doesn't survive `JSON.stringify`, and drivers return `null`.

```typescript
import type { Wire } from "functype";

type ChainRow = Wire<{
  readonly id: string;
  readonly entity_id: string | null;
  readonly literal: string | null;
}>;
```

**Three states: left out, cleared, set.** This is the case where `Option` is wrong, not just awkward. A patch body's field can be left out (keep the old value), sent as `null` (remove it) or sent with a value (replace it). `Option<T>` has two states, so converting loses the difference. `prefer-option` says so when one union, as a type alias's body or a type-literal or interface member, holds both `null` and `undefined`.

```typescript
import type { Wire } from "functype";

type Clearable<T> = Wire<T | null | undefined>; // undefined: keep, null: remove, T: replace

const keep = <T>(next: Wire<T | undefined>, old: T): T =>
  next === undefined ? old : next;
```

**Types inferred from a schema.** A type from `z.infer`, valibot or a decoder is the wire shape by definition. Wrap the alias, and convert a field to `Option` when code first decides something from it.

```typescript
import type { Wire } from "functype";

type Given<T> = Wire<T | undefined>; // a tool input field that may be left out
```

**Helpers that pass a wire value through.** A row mapper that reads a nullable column and writes a nullable field decides nothing about the absence. An `Option` there only adds a conversion you undo.

```typescript
import type { Wire } from "functype";

type Quantity = { readonly value: number; readonly unit: string };

const quantity = (
  value: Wire<number | null>,
  unit: Wire<string | null>,
): Wire<Quantity | null> =>
  value === null || unit === null ? null : { value, unit };
```

**Props and options objects.** The caller writes `<X a="v" />`, so these are host shapes. `prefer-option` skips `a?: T` and `a: T | undefined` on a member or parameter by default.

### Where Option stays the answer

A function result that code goes on to read is an `Option`. The driver returns a row or `undefined`, the function converts it once, and callers `fold`.

```typescript
import { Option } from "functype";

type Entity = { readonly name: string };

const findByName = (
  entities: ReadonlyArray<Entity>,
  name: string,
): Option<Entity> => Option(entities.find((entity) => entity.name === name));
```

### Misuses

- **`Wire` on a domain type just to quiet the rule.** Ask whether the value really crosses a boundary in this exact shape.
- **`Option` inside a row or body type.** It serializes as an object and doesn't round-trip.
- **A `Wire` value that keeps flowing** past the first function that decides something from it.
