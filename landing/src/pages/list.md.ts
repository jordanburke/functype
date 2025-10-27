export async function GET() {
  const markdown = `# List<A>

Immutable array with functional operations.

## Overview

List is an immutable, persistent collection that provides functional operations like map, filter, and fold. It's implemented with structural sharing for efficient updates.

## Key Features

- **Immutability**: All operations return new Lists, original is unchanged
- **Type Safety**: Fully typed with TypeScript generics
- **Rich API**: map, filter, fold, flatMap, and many more operations
- **Iterable**: Works with for...of loops and spread operator
- **Do-notation**: Optimized for List comprehensions (up to 12x faster!)

## Creating Lists

\`\`\`typescript
import { List } from "functype"

// From array
const list1 = List([1, 2, 3, 4])

// Empty list
const empty = List.empty<number>()

// Single element
const single = List.of(42)

// Range
const range = List.range(1, 5)           // List([1, 2, 3, 4, 5])

// Fill
const filled = List.fill(3, "x")         // List(["x", "x", "x"])
\`\`\`

## Transforming Lists

\`\`\`typescript
const numbers = List([1, 2, 3, 4, 5])

// map: Transform each element
const doubled = numbers.map(x => x * 2)  // List([2, 4, 6, 8, 10])

// filter: Keep elements matching predicate
const evens = numbers.filter(x => x % 2 === 0)  // List([2, 4])

// flatMap: Map and flatten
const pairs = numbers.flatMap(x =>
  List([x, x * 2])
)  // List([1, 2, 2, 4, 3, 6, 4, 8, 5, 10])
\`\`\`

## Adding/Removing Elements

\`\`\`typescript
const list = List([1, 2, 3])

// Prepend
const prepended = list.prepend(0)        // List([0, 1, 2, 3])

// Append
const appended = list.append(4)          // List([1, 2, 3, 4])

// Add (alias for append)
const added = list.add(4)                // List([1, 2, 3, 4])

// Remove
const removed = list.remove(2)           // List([1, 3])

// Concat
const combined = list.concat(List([4, 5]))  // List([1, 2, 3, 4, 5])
\`\`\`

## Accessing Elements

\`\`\`typescript
const list = List([1, 2, 3, 4, 5])

// Get by index (returns Option)
const first = list.get(0)                // Some(1)
const missing = list.get(10)             // None

// Head and tail
const head = list.head()                 // Some(1)
const tail = list.tail()                 // List([2, 3, 4, 5])

// Last
const last = list.last()                 // Some(5)

// Take/drop
const taken = list.take(3)               // List([1, 2, 3])
const dropped = list.drop(2)             // List([3, 4, 5])
\`\`\`

## Folding and Reducing

\`\`\`typescript
const list = List([1, 2, 3, 4, 5])

// foldLeft: Accumulate from left to right
const sum = list.foldLeft(0)((acc, x) => acc + x)  // 15

// foldRight: Accumulate from right to left
const reversed = list.foldRight(List.empty<number>())(
  (x, acc) => acc.prepend(x)
)

// reduce: foldLeft with first element as initial value
const product = list.reduce((acc, x) => acc * x)  // 120
\`\`\`

## Searching and Checking

\`\`\`typescript
const list = List([1, 2, 3, 4, 5])

// find: First element matching predicate
const found = list.find(x => x > 3)      // Some(4)

// exists: Check if any element matches
const hasEven = list.exists(x => x % 2 === 0)  // true

// forall: Check if all elements match
const allPositive = list.forall(x => x > 0)    // true

// contains: Check for specific element
const hasThree = list.contains(3)        // true

// count: Count matching elements
const evenCount = list.count(x => x % 2 === 0)  // 2
\`\`\`

## List Comprehensions with Do-notation

List comprehensions using Do-notation are **up to 12x faster** than traditional flatMap chains!

\`\`\`typescript
import { Do, $ } from "functype"

// Cartesian product
const pairs = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List([10, 20]))
  return { x, y, sum: x + y }
})
// List([
//   { x: 1, y: 10, sum: 11 },
//   { x: 1, y: 20, sum: 21 },
//   { x: 2, y: 10, sum: 12 },
//   ...
// ])

// With conditions (like guards in Scala)
const filtered = Do(function* () {
  const x = yield* $(List([1, 2, 3, 4, 5]))
  const y = yield* $(List([1, 2, 3]))
  if (x + y < 5) return x + y  // Guard condition
  return undefined  // Skip this combination
}).flatMap(x => x === undefined ? List.empty() : List([x]))
\`\`\`

## Converting Lists

\`\`\`typescript
const list = List([1, 2, 3])

// To array
const arr = list.toArray()               // [1, 2, 3]

// To Set
const set = List([1, 2, 2, 3]).toSet()  // Set([1, 2, 3])

// To Option
const opt = list.toOption()              // Some(List([1, 2, 3]))
List.empty().toOption()                  // None
\`\`\`

## Utility Operations

\`\`\`typescript
const list = List([1, 2, 3, 4, 5])

// reverse
const reversed = list.reverse()          // List([5, 4, 3, 2, 1])

// sort
const sorted = List([3, 1, 4, 1, 5]).sort()  // List([1, 1, 3, 4, 5])

// distinct (remove duplicates)
const unique = List([1, 2, 2, 3]).distinct()  // List([1, 2, 3])

// zip
const pairs = List([1, 2, 3]).zip(List(["a", "b", "c"]))
// List([[1, "a"], [2, "b"], [3, "c"]])

// partition
const [evens, odds] = List([1, 2, 3, 4, 5]).partition(x => x % 2 === 0)
// evens: List([2, 4]), odds: List([1, 3, 5])

// groupBy
const grouped = List([1, 2, 3, 4, 5]).groupBy(x => x % 2)
// Map with keys 0 and 1
\`\`\`

## Iteration

\`\`\`typescript
const list = List([1, 2, 3])

// forEach
list.forEach(x => console.log(x))

// for...of
for (const x of list) {
  console.log(x)
}

// Spread operator
const arr = [...list]                    // [1, 2, 3]
\`\`\`

## Performance

- **Creation**: O(n) from array
- **Prepend**: O(1) amortized
- **Append**: O(1) amortized
- **Get by index**: O(1)
- **Map/Filter**: O(n)
- **Do-notation**: 2.5x to 12x faster than flatMap for comprehensions

## Common Patterns

### Processing pipelines

\`\`\`typescript
const result = List([1, 2, 3, 4, 5])
  .filter(x => x % 2 === 0)
  .map(x => x * 2)
  .foldLeft(0)((acc, x) => acc + x)
// 12 (sum of [4, 8])
\`\`\`

### Safe head access

\`\`\`typescript
const list = List([1, 2, 3])
const first = list.head().getOrElse(0)   // 1

const empty = List.empty<number>()
const defaultFirst = empty.head().getOrElse(0)  // 0
\`\`\`

### Building lists

\`\`\`typescript
const list = List.range(1, 10)
  .filter(x => x % 2 === 0)
  .map(x => x * x)
// List([4, 16, 36, 64, 100])
\`\`\`

## When to Use List

### ✓ Use List for:

- Immutable collections that change frequently
- Functional transformations (map, filter, fold)
- Do-notation comprehensions (huge performance win!)
- Maintaining order of elements

### ✗ Avoid List for:

- Large collections that need O(1) lookup by key (use Map)
- Sets with uniqueness constraint (use Set)
- Frequent index-based access (consider LazyList or array)

## API Reference

For complete API documentation, see the [List API docs](https://functype.org/api-docs/classes/List.html).

## Learn More

- [Set Documentation](https://functype.org/set)
- [Map Documentation](https://functype.org/map)
- [Do-notation Guide](https://functype.org/do-notation)
- [Feature Matrix](https://functype.org/feature-matrix)
`

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}
