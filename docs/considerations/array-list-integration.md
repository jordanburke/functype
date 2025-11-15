# Array-List Integration

## Problem Statement

How can functype make it more seamless to work with both native JavaScript arrays and functype's `List<A>` type?

**User Goals:**

1. Allow arrays to be used where Lists are expected without explicit conversion
2. Make List creation feel as natural as array creation
3. Enable easy conversion between arrays and Lists
4. Avoid confusion about which type is being used

**Constraints:**

- Must maintain type safety
- Should not pollute global scope
- Must work safely in library contexts
- Should be opt-in where possible

## Current Implementation

### Array-to-List Conversion (Already Works!)

```typescript
import { List } from "functype"

// Arrays automatically convert to Lists
const list = List([1, 2, 3]) // ✅ Works!
const fromSet = List(new Set([1, 2, 3])) // ✅ Any iterable works!

// Back to array
const array = list.toArray() // number[]
```

**Implementation Detail:**

```typescript
// src/list/List.ts:44
const array: A[] = Array.from(values ?? [])
```

The `List` constructor accepts `Iterable<A>`, so **arrays already work seamlessly**.

### Current API

```typescript
// Constructor function (not class)
const list = List([1, 2, 3])

// Companion methods
List.fromJSON(json)
List.fromYAML(yaml)
List.fromBinary(binary)
```

## Research: Other Libraries

### fp-ts

**Approach:** Module functions only, no prototype extensions

```typescript
import * as A from "fp-ts/Array"
import * as L from "fp-ts/List"

// Uses plain arrays with functional utilities
const doubled = A.map((x: number) => x * 2)([1, 2, 3])

// No array-to-List conversion needed - arrays ARE the data structure
```

**Design Philosophy:**

- Arrays are the core collection type
- No wrapper types needed
- Functions work directly on arrays

**Trade-offs:**

- ✅ Zero conversion overhead
- ✅ No confusion about types
- ❌ Less type safety (arrays are mutable)
- ❌ Can't add custom methods to arrays

### Immutable.js

**Approach:** Distinct types, explicit conversion

```typescript
import { List } from "immutable"

// Must explicitly create Immutable Lists
const list = List([1, 2, 3])
const list2 = List.of(1, 2, 3)

// Convert back
const array = list.toArray()
```

**Trade-offs:**

- ✅ Clear distinction between mutable/immutable
- ✅ Rich API on List type
- ❌ Conversion overhead when interoping with native APIs
- ❌ Shadow native List (if it existed)

### Scala

**Approach:** Rich companion objects, multiple constructors

```scala
// Multiple ways to create Lists
val list1 = List(1, 2, 3)
val list2 = List.apply(1, 2, 3)
val list3 = List.range(1, 10)
val list4 = List.fill(5)(0)

// Arrays are separate
val array = Array(1, 2, 3)
val fromArray = array.toList
```

**Design Philosophy:**

- Companion objects provide rich creation APIs
- Clear separation between Array and List
- Multiple constructors for different use cases

### Ramda

**Approach:** Functions work on arrays directly

```javascript
import { map, filter } from "ramda"

// No List type - functions work on arrays
const doubled = map((x) => x * 2, [1, 2, 3])
```

**Trade-offs:**

- ✅ No conversion needed
- ✅ Works with native arrays
- ❌ Arrays remain mutable
- ❌ No custom methods

## Proposed Approaches

### Approach 1: ListLike Union Type ✅ Recommended

Create a union type accepting both Lists and arrays:

```typescript
// Add to functype
export type ListLike<A> = List<A> | readonly A[] | A[]

// Helper for normalization
export function toList<A>(value: ListLike<A>): List<A> {
  return Array.isArray(value) ? List(value) : value
}

// Usage - functions accept both!
function process(items: ListLike<number>): List<number> {
  const list = toList(items)
  return list.map((x) => x * 2)
}

process([1, 2, 3]) // ✅ Array
process(List([1, 2, 3])) // ✅ List
```

**Trade-offs:**

- ✅ Type-safe
- ✅ Explicit and discoverable
- ✅ No runtime overhead when not used
- ✅ Works everywhere (params, return types, generics)
- ✅ No global pollution
- ❌ Requires toList() calls in function implementations

### Approach 2: Companion Methods (List.from, List.of)

Expand the Companion pattern with more constructors:

```typescript
const ListCompanion = {
  // Existing
  fromJSON: <A>(json: string): List<A> => {
    /* ... */
  },
  fromYAML: <A>(yaml: string): List<A> => {
    /* ... */
  },
  fromBinary: <A>(binary: string): List<A> => {
    /* ... */
  },

  // NEW: More discoverable constructors
  from: <A>(iterable: Iterable<A>): List<A> => List(iterable),
  of: <A>(...items: A[]): List<A> => List(items),
  fromArray: <A>(arr: readonly A[]): List<A> => List(arr),

  // Scala-inspired utilities
  range: (start: number, end: number): List<number> => List(Array.from({ length: end - start }, (_, i) => start + i)),
  fill: <A>(count: number, value: A): List<A> => List(Array.from({ length: count }, () => value)),
  empty: <A>(): List<A> => List([]),
}

// Usage
List.from([1, 2, 3]) // Explicit conversion
List.of(1, 2, 3) // Variadic (no array syntax)
List.range(1, 10) // [1..9]
List.fill(5, 0) // [0, 0, 0, 0, 0]
```

**Trade-offs:**

- ✅ Highly discoverable
- ✅ Familiar to Scala/Java developers
- ✅ No global pollution
- ✅ Extends existing pattern
- ✅ Easy to document
- ❌ Slightly more API surface

### Approach 3: Utility Module

Separate module for conversion utilities:

```typescript
// functype/utils/conversions.ts
export const toList = <A>(value: A[] | List<A>): List<A> => (Array.isArray(value) ? List(value) : value)

export const asList = <A>(value: A[]): List<A> => List(value)

export const isList = <A>(value: unknown): value is List<A> =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "List"

// Usage
import { toList, asList, isList } from "functype/utils/conversions"

const list = asList([1, 2, 3])
if (isList(value)) {
  // TypeScript knows value is List<unknown>
}
```

**Trade-offs:**

- ✅ Clean separation
- ✅ Tree-shakeable
- ✅ No pollution
- ❌ Additional import required
- ❌ Less discoverable

### Approach 4: Prototype Extension ⚠️ NOT Recommended

Add `.toList()` method to Array.prototype:

```typescript
// functype/extensions/array.ts
declare global {
  interface Array<T> {
    toList(): List<T>
  }
}

export function enableArrayExtensions() {
  if (!Array.prototype.toList) {
    Array.prototype.toList = function () {
      return List(this)
    }
  }
}

// Usage (opt-in)
import { enableArrayExtensions } from "functype/extensions/array"
enableArrayExtensions()[(1, 2, 3)].toList() // List<number>
```

**Why This Is Problematic:** See [Prototype Extension Problems](#prototype-extension-problems) below.

### Approach 5: Fluent Wrapper

Provide a fluent API wrapper for chaining:

```typescript
// functype/utils/fluent.ts
export function fluent<A>(arr: A[]) {
  return {
    toList: () => List(arr),
    map: <B>(f: (a: A) => B) => fluent(arr.map(f)),
    filter: (p: (a: A) => boolean) => fluent(arr.filter(p)),
    unwrap: () => arr,
  }
}

// Usage
import { fluent } from "functype/utils/fluent"

const result = fluent([1, 2, 3])
  .filter((x) => x > 1)
  .map((x) => x * 2)
  .toList()
```

**Trade-offs:**

- ✅ Method chaining on arrays
- ✅ No globals
- ✅ Opt-in
- ❌ Another wrapper layer
- ❌ Not as ergonomic as native methods

## Prototype Extension Problems

### Problem 1: Library Dependency Side Effects

```typescript
// Library B (uses functype)
import { List } from "functype"
import { enableArrayExtensions } from "functype/extensions/array"

// Library B calls this internally
enableArrayExtensions()

export function processItems(items: number[]) {
  return items.toList().map((x) => x * 2)
}
```

**Impact on End Users:**

```typescript
// End User's App (just imports Library B)
import { processItems } from "library-b"

// User never called enableArrayExtensions()
// But Arrays are STILL modified because Library B did!
;[1, 2, 3].toList() // ✅ Works, but user didn't ask for this!
```

**Issues:**

- ❌ Surprising side effect from importing
- ❌ User has no control
- ❌ User might not know functype exists
- ❌ Cannot be undone

### Problem 2: Multiple Library Conflicts

```typescript
// Library B adds functype's .toList()
Array.prototype.toList = function () {
  return FunctypeList(this)
}

// Library C adds different .toList()
Array.prototype.toList = function () {
  return DifferentList(this)
}

// End User's App
import "library-b" // Adds .toList() → functype List
import "library-c" // Overwrites .toList() → Different List!

// Which one do you get? Last import wins!
;[1, 2, 3].toList() // Library C's version - Library B might break!
```

**Issues:**

- ❌ Last import wins
- ❌ Import order matters
- ❌ Very hard to debug
- ❌ Silent failures

### Problem 3: Global Scope Pollution

```typescript
// Even with "opt-in", it's ALWAYS global once called

// Module A
import { enableArrayExtensions } from "functype/extensions/array"
enableArrayExtensions()[
  // Module B (different file, never imported functype)
  // But Arrays are STILL modified!
  (1, 2, 3)
].toList() // Works! Module B doesn't know why
```

**Issues:**

- ❌ Cannot scope to module
- ❌ Affects entire runtime
- ❌ Surprising behavior
- ❌ Violates principle of least surprise

### Problem 4: Library Author Dilemma

If you're building a library that uses functype:

**Option A: Enable extensions**

- ❌ Forces prototype pollution on all users
- ❌ Might conflict with their other dependencies

**Option B: Don't enable extensions**

- ✅ Safe, no pollution
- ✅ Users have control
- ❌ Can't use the convenience methods yourself

**No good option** - prototype extensions create lose-lose situations for library authors.

### Community Standards

| Pattern                          |  Library Use   |    App Use     | Risk Level |
| -------------------------------- | :------------: | :------------: | :--------: |
| Prototype extension              |    ❌ Never    |    ⚠️ Risky    |    High    |
| Module augmentation (types only) |   ⚠️ Careful   |     ✅ OK      |    Low     |
| Helper functions                 | ✅ Recommended | ✅ Recommended |    None    |
| Companion methods                | ✅ Recommended | ✅ Recommended |    None    |

### Historical Context

**Libraries that tried and regretted it:**

- **Prototype.js** - Extended native prototypes, caused massive compatibility issues
- **MooTools** - Similar problems, forced to deprecate extensions
- **Early Lodash** - Moved away from prototype pollution

**Libraries that avoid it:**

- **fp-ts** - Pure functions only
- **Ramda** - No prototype modifications
- **Modern Lodash** - Utility functions
- **Immutable.js** - Own data structures

## Comparison Matrix

| Approach                | Safety | DX  | Discoverability | Tree-Shakeable | Library-Safe | Complexity |
| ----------------------- | :----: | :-: | :-------------: | :------------: | :----------: | :--------: |
| **ListLike Union**      |   ✅   | ✅  |       ⚠️        |       ✅       |      ✅      |    Low     |
| **Companion Methods**   |   ✅   | ✅  |       ✅        |       ✅       |      ✅      |    Low     |
| **Utility Module**      |   ✅   | ⚠️  |       ⚠️        |       ✅       |      ✅      |    Low     |
| **Prototype Extension** |   ❌   | ✅  |       ✅        |       ❌       |      ❌      |   Medium   |
| **Fluent Wrapper**      |   ✅   | ✅  |       ⚠️        |       ✅       |      ✅      |   Medium   |

## Recommendations

### Phase 1: Immediate Additions ✅

**Add companion methods** (extends existing pattern):

```typescript
const ListCompanion = {
  // Existing
  fromJSON: <A>(json: string): List<A> => {
    /* ... */
  },
  fromYAML: <A>(yaml: string): List<A> => {
    /* ... */
  },
  fromBinary: <A>(binary: string): List<A> => {
    /* ... */
  },

  // NEW: Add these
  from: <A>(iterable: Iterable<A>): List<A> => List(iterable),
  of: <A>(...items: A[]): List<A> => List(items),
  empty: <A>(): List<A> => List([]),
  range: (start: number, end: number): List<number> => List(Array.from({ length: end - start }, (_, i) => start + i)),
  fill: <A>(count: number, value: A): List<A> => List(Array.from({ length: count }, () => value)),
}
```

**Rationale:**

- Natural extension of existing Companion pattern
- Highly discoverable
- Zero breaking changes
- Familiar to Scala/Java developers

### Phase 2: Type Utilities

**Add `ListLike` type and helpers:**

```typescript
// src/list/index.ts
export type ListLike<A> = List<A> | readonly A[] | A[]

export function toList<A>(value: ListLike<A>): List<A> {
  return Array.isArray(value) ? List(value) : value
}

export function isList<A>(value: unknown): value is List<A> {
  return typeof value === "object" && value !== null && "_tag" in value && value._tag === "List"
}
```

**Rationale:**

- Enables flexible function parameters
- Type-safe
- No runtime overhead
- Common pattern in typed FP

### Phase 3: Utility Module (Optional)

**Create optional utilities module:**

```typescript
// src/utils/conversions.ts
export { toList, isList, type ListLike } from "../list"
export { toOption, isOption } from "../option"
export { toEither, isEither } from "../either"
// ... etc
```

**Rationale:**

- Convenient single import location
- Grouped utility functions
- Optional (doesn't affect main exports)

### What NOT to Do ❌

**Do NOT add prototype extensions** (even as opt-in):

```typescript
// ❌ DON'T create this
export function enableArrayExtensions() { ... }
```

**Reasons:**

1. Library safety concerns (affects all consumers)
2. Conflict risks with other libraries
3. Against community standards
4. Impossible to control scope
5. Breaks tree-shaking

**If users desperately want it:**

- They can add it to their own application code
- Document why functype doesn't provide it
- Show them how to do it safely in app context

## Implementation Examples

### Example 1: Flexible Function Parameters

```typescript
import { type ListLike, toList } from "functype"

function processNumbers(nums: ListLike<number>): List<number> {
  const list = toList(nums)
  return list.filter((x) => x > 0).map((x) => x * 2)
}

// Works with arrays OR Lists!
processNumbers([1, -2, 3]) // Array
processNumbers(List([1, -2, 3])) // List
```

### Example 2: Rich Creation API

```typescript
import { List } from "functype"

// Multiple ways to create Lists
const list1 = List([1, 2, 3]) // Existing
const list2 = List.of(1, 2, 3) // New: variadic
const list3 = List.from([1, 2, 3]) // New: explicit
const list4 = List.range(1, 10) // New: range
const list5 = List.fill(5, 0) // New: fill
const list6 = List.empty<number>() // New: empty
```

### Example 3: Type Guards

```typescript
import { isList, type List } from "functype"

function handleValue(value: unknown) {
  if (isList<number>(value)) {
    // TypeScript knows value is List<number>
    return value.map((x) => x * 2)
  }
  throw new TypeError("Expected List")
}
```

## Migration Path

### From Current Code

Existing code continues to work:

```typescript
// Before
const list = List([1, 2, 3])

// After (still works)
const list = List([1, 2, 3])

// New alternatives available
const list2 = List.of(1, 2, 3)
const list3 = List.from([1, 2, 3])
```

### For Library Authors

```typescript
// Option 1: Accept arrays OR Lists
import { type ListLike, toList } from "functype"

export function transform(items: ListLike<number>) {
  const list = toList(items)
  return list.map((x) => x * 2)
}

// Option 2: Accept only Lists (explicit)
import { type List } from "functype"

export function transform(items: List<number>) {
  return items.map((x) => x * 2)
}

// Users convert at call site
transform(List.from([1, 2, 3]))
```

## Testing Considerations

```typescript
describe("List creation", () => {
  it("should create from array via constructor", () => {
    expect(List([1, 2, 3]).toArray()).toEqual([1, 2, 3])
  })

  it("should create from .from() method", () => {
    expect(List.from([1, 2, 3]).toArray()).toEqual([1, 2, 3])
  })

  it("should create from .of() method", () => {
    expect(List.of(1, 2, 3).toArray()).toEqual([1, 2, 3])
  })

  it("should accept ListLike in functions", () => {
    function double(items: ListLike<number>) {
      return toList(items).map((x) => x * 2)
    }

    expect(double([1, 2, 3])).toEqual(List([2, 4, 6]))
    expect(double(List([1, 2, 3]))).toEqual(List([2, 4, 6]))
  })
})
```

## References

### External Resources

- [MDN: Array.from()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from)
- [MDN: Array.of()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/of)
- [TypeScript: Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [Scala List Companion Object](https://www.scala-lang.org/api/current/scala/collection/immutable/List$.html)

### Internal Documentation

- [src/list/List.ts](../../src/list/List.ts) - Current List implementation
- [src/companion/Companion.ts](../../src/companion/Companion.ts) - Companion pattern
- [Native Type Naming Considerations](./native-type-naming.md) - Related design discussion

## Conclusion

**Recommended Implementation:**

1. ✅ **Add companion methods** (`List.from()`, `List.of()`, `List.range()`, etc.)
2. ✅ **Add `ListLike` type** for flexible function parameters
3. ✅ **Add utility functions** (`toList()`, `isList()`)
4. ❌ **Do NOT add prototype extensions** (even as opt-in)

This approach maximizes developer ergonomics while maintaining safety, library compatibility, and following community best practices. The companion method pattern is already established in functype, making this a natural evolution rather than a breaking change.
