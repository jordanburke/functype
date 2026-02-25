# List<A>

Immutable arrays with functional operations.

## Overview

List is an immutable collection that wraps arrays and provides functional operations. Every transformation creates a new List, preserving the original data.

## Basic Usage

```typescript
import { List } from "functype/list"

// Creating Lists
const nums = List([1, 2, 3, 4, 5])
const empty = List.empty<number>()
const single = List.of(42)

// Basic operations
nums.head // 1
nums.tail // List([2, 3, 4, 5])
nums.size // 5
nums.isEmpty // false
```

## Constructors

| Method                   | Description             |
| ------------------------ | ----------------------- |
| `List(array)`            | Create from array       |
| `List.of(...values)`     | Create from values      |
| `List.empty<T>()`        | Create empty typed list |
| `List.range(start, end)` | Create range of numbers |

## Transformations

```typescript
// Map - transform each element
List([1, 2, 3]).map((x) => x * 2) // List([2, 4, 6])

// Filter - keep matching elements
List([1, 2, 3, 4]).filter((x) => x % 2 === 0) // List([2, 4])

// FlatMap - flatten nested results
List([1, 2]).flatMap((x) => List([x, x * 10])) // List([1, 10, 2, 20])

// Fold - reduce to single value
List([1, 2, 3]).foldLeft(0)((acc, x) => acc + x) // 6
```

## Collection Operations

```typescript
// Take and drop
List([1, 2, 3, 4, 5]).take(3) // List([1, 2, 3])
List([1, 2, 3, 4, 5]).takeRight(2) // List([4, 5])
List([1, 2, 3, 4, 5]).drop(2) // List([3, 4, 5])
List([1, 2, 3, 4, 5]).takeWhile((x) => x < 4) // List([1, 2, 3])
List([1, 2, 3, 4, 5]).slice(1, 4) // List([2, 3, 4])

// Element access
List([1, 2, 3]).head // 1
List([1, 2, 3]).headOption // Option(1)
List([1, 2, 3]).last // 3
List([1, 2, 3]).lastOption // Option(3)
List([1, 2, 3]).tail // List([2, 3])
List([1, 2, 3]).init // List([1, 2])

// Find and contains
List([1, 2, 3]).find((x) => x > 1) // 2 (or undefined)
List([1, 2, 3]).contains(2) // true
List([1, 2, 3]).exists((x) => x > 2) // true

// Combine and reorder
List([1, 2]).concat(List([3, 4])) // List([1, 2, 3, 4])
List([1, 2]).append(3) // List([1, 2, 3])
List([1, 2]).prepend(0) // List([0, 1, 2])
List([1, 2, 3]).reverse() // List([3, 2, 1])
```

## Grouping and Sorting

```typescript
// Group by key
List([1, 2, 3, 4]).groupBy((x) => (x % 2 === 0 ? "even" : "odd"))
// Map { "odd" => List([1, 3]), "even" => List([2, 4]) }

// Partition - split by predicate [matching, non-matching]
List([1, 2, 3, 4, 5]).partition((x) => x % 2 === 0)
// [List([2, 4]), List([1, 3, 5])]

// Span - split at first non-matching [prefix, rest]
List([1, 2, 3, 4, 1]).span((x) => x < 3)
// [List([1, 2]), List([3, 4, 1])]

// Sort
List([3, 1, 2]).sorted() // List([1, 2, 3])
List(["b", "a"]).sortBy((s) => s) // List(["a", "b"])

// Distinct
List([1, 2, 2, 3, 3, 3]).distinct() // List([1, 2, 3])

// Zip
List([1, 2, 3]).zip(List(["a", "b", "c"])) // List([[1, "a"], [2, "b"], [3, "c"]])
List(["a", "b", "c"]).zipWithIndex() // List([["a", 0], ["b", 1], ["c", 2]])
```

## Do-Notation (Cartesian Products)

```typescript
import { Do, $ } from "functype/do"

// Generate all combinations
const result = Do(function* () {
  const x = yield* $(List([1, 2]))
  const y = yield* $(List(["a", "b"]))
  return `${x}${y}`
}) // List(["1a", "1b", "2a", "2b"])

// Performance: 175x faster than nested flatMaps
```

## Key Features

- **Immutable**: All operations return new Lists
- **Optimized Performance**: 12x faster than nested flatMaps for complex operations
- **Functional Methods**: map, filter, fold, groupBy, and 40+ more
- **Type-Safe**: Full TypeScript inference for all transformations

## When to Use List

- Data transformations that need to preserve originals (UI state, historical data)
- Functional pipelines with map/filter/fold
- Cartesian products with Do-notation (generating combinations, test data)
- When immutability is important

## Type Conversions

```typescript
list.toArray() // Convert to native array
list.toSet() // Convert to Set<A>
list.headOption // Option<A> for first element
```

## API Reference

See full API documentation at [functype API docs](https://jordanburke.github.io/functype/modules/list.html)
