# Set<A>

Immutable sets of unique values.

## Overview

Set holds each value once, in insertion order, and never changes in place: every operation returns a new Set. Values compare the way a native `Set` compares them, so objects match by identity and `NaN` equals `NaN`. Import it under its own name; the built-in stays reachable as `globalThis.Set`.

## Basic Usage

```typescript
import { Set } from "functype/set";

const tags = Set(["a", "b", "a"]); // Set(a, b): duplicates collapse
const empty = Set.empty<string>();

tags.size; // 2
tags.isEmpty; // false
tags.has("a"); // true

tags.add("c"); // Set(a, b, c)
tags.add("a"); // Set(a, b): already there
tags.remove("a"); // Set(b)
```

## Constructors

| Method              | Description                          |
| ------------------- | ------------------------------------ |
| `Set(iterable)`     | Create from an array or any iterable |
| `Set.of(...values)` | Create from values                   |
| `Set.empty<T>()`    | Create an empty typed set            |

## Set Operations

These have the same names as native `Set` (ES2025) and give the same elements. `other` can be any iterable: an array, a native `Set`, a functype `Set` or a `List`. Results keep this set's order, then `other`'s.

```typescript
const a = Set([1, 2, 3]);

a.union([3, 4, 5]); // Set(1, 2, 3, 4, 5)
a.intersection([2, 3, 4]); // Set(2, 3)
a.difference([3]); // Set(1, 2)
a.symmetricDifference([3, 4]); // Set(1, 2, 4)

a.isSubsetOf([1, 2, 3, 4]); // true
a.isSupersetOf([1, 2]); // true
a.isDisjointFrom([7, 8]); // true
```

`union` and `symmetricDifference` widen the element type, so `Set<number>.union(["a"])` is a `Set<number | string>`.

## Transformations

```typescript
const nums = Set([1, 2, 3]);

nums.map((x) => x % 2); // Set(1, 0): equal results collapse
nums.filter((x) => x > 1); // Set(2, 3)
nums.flatMap((x) => [x, x + 10]); // Set(1, 11, 2, 12, 3, 13)
nums.fold(0, (sum, x) => sum + x); // 6

// Async map: one call at a time by default
await nums.mapAsync(async (x) => x * 2); // Set(2, 4, 6)
await nums.mapAsync(async (x) => x * 2, { concurrency: 4 }); // up to 4 at once
```

## Checking Elements

```typescript
nums.has(2); // true
nums.exists((x) => x > 2); // true: at least one matches
nums.every((x) => x > 0); // true: all match, and true for an empty Set
```

## Type Conversions

```typescript
nums.toList(); // List([1, 2, 3])
nums.toArray(); // [1, 2, 3]
List([1, 1, 2]).toSet(); // Set(1, 2)
```

## When to Use Set

- Membership checks and de-duplication
- Combining groups of ids, tags or permissions with union, intersection and difference
- Anywhere a value should appear once, and the collection should not change in place

## API Reference

See full API documentation at [functype API docs](https://functype.org/api-docs/interfaces/Set.html)
