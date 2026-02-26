# functype + React Query: Structural Sharing Causes OOM/CPU Spike

## Summary

functype types (List, Option, Either, etc.) cause React Query's `replaceEqualDeep` to enter infinite recursion, resulting in browser tab crashes (OOM) or extreme CPU usage. This affects any application using functype types as React Query return values — which is the primary use case in our codebase.

## Reproduction

```typescript
import { replaceEqualDeep } from "@tanstack/react-query"
import { List } from "functype"

// This crashes Node.js with OOM:
replaceEqualDeep(List.of(1, 2, 3), List.of(1, 2, 3))
```

In a browser, this manifests as the tab becoming unresponsive ("page unresponsive, kill?") whenever React Query refetches any query that returns a functype type.

## Root Cause Analysis

### How React Query's Structural Sharing Works

When a query refetches, React Query compares old and new data using `replaceEqualDeep()` to preserve reference identity where possible. This avoids unnecessary re-renders when data hasn't actually changed.

The algorithm:
1. If `a === b`, return `a` (same reference — done)
2. If `isPlainObject(a) && isPlainObject(b)`, iterate all keys via `Object.keys()` and recursively compare each property value
3. If `isPlainArray(a) && isPlainArray(b)`, iterate elements and recursively compare
4. Otherwise, return `b` (treat as opaque value)

### Why functype Types Fail

**Problem 1: `isPlainObject` returns `true` for functype types**

React Query's `isPlainObject` check (from `@tanstack/query-core/src/utils.ts`):

```typescript
export function isPlainObject(o: any): o is Record<PropertyKey, unknown> {
  if (!hasObjectPrototype(o)) {
    return false
  }
  const ctor = o.constructor
  if (ctor === undefined) return true
  const prot = ctor.prototype
  if (!hasObjectPrototype(prot)) return false
  if (!prot.hasOwnProperty("isPrototypeOf")) return false
  return true
}

function hasObjectPrototype(o: any): boolean {
  return Object.prototype.toString.call(o) === "[object Object]"
}
```

functype types are plain object literals — their prototype is `Object.prototype`, their constructor is `Object`, and `Object.prototype.toString.call(list)` returns `"[object Object]"`. So `isPlainObject` returns `true`, and `replaceEqualDeep` tries to traverse all enumerable properties.

**Problem 2: Getter properties cause infinite recursion**

List has getter properties that return **new functype objects** on every access:

```typescript
// List.ts — these are getters on an object literal (enumerable by default)
get tail() {
  return ListObject(array.slice(1))   // NEW List every access
},
get init() {
  return ListObject(array.length === 0 ? [] : array.slice(0, -1))  // NEW List
},
get headOption() {
  return array.length > 0 ? Option(array[0]) : None<A>()  // NEW Option
},
get lastOption() {
  return array.length > 0 ? Option(array[array.length - 1]) : None<A>()  // NEW Option
},
```

When `replaceEqualDeep` iterates `Object.keys(list)`, it encounters `tail`. Accessing `list.tail` triggers the getter, creating a new List. It then recursively calls `replaceEqualDeep(oldList.tail, newList.tail)`. That new List also has a `tail` getter... infinite recursion.

**The depth guard doesn't save us:** React Query has `if (depth > 500) return b`, so it doesn't technically OOM in all cases. But it still creates ~500 new List objects per property, per comparison. With 60+ enumerable properties on List, each refetch triggers thousands of unnecessary object allocations. With polling (every 5 seconds) and 20+ queries, this saturates the CPU.

**Problem 3: Structural sharing can never work anyway**

Even without the recursive getters, structural sharing is fundamentally broken for functype types. Each List instance has ~60 enumerable properties, most of which are closure-bound functions. Function closures are unique per instance — `oldList.map !== newList.map` even if the underlying data is identical. So `replaceEqualDeep` would always conclude the data has changed and return a new reference, defeating the purpose of structural sharing entirely.

## The Impact in Practice

On a page with 20 video cards, each backed by React Query:

1. `useVideosWithPolling` refetches every 5 seconds (polling for processing status)
2. Each refetch returns `List<VideoDataRow>` — a functype List
3. `replaceEqualDeep` tries to compare old vs new List
4. Hits `tail` getter → 500-deep recursion → thousands of allocations
5. Always returns new reference (closures differ) → triggers re-render
6. Re-render causes 20 child components to re-render
7. Each re-render may trigger additional queries...
8. Browser becomes unresponsive within seconds

## Recommended Fixes

### Fix 1: `Symbol.toStringTag` (Simplest — 1 line per type)

Add `[Symbol.toStringTag]` to each functype type's object literal:

```typescript
const ListObject = <A>(values?: Iterable<A>): List<A> => {
  const array: A[] = Array.from(values ?? [])

  const list: List<A> = {
    [Symbol.toStringTag]: "List",  // <-- This one line
    _tag: "List" as const,
    // ... everything else unchanged
  }

  return list
}
```

**How it works:** `Object.prototype.toString.call(list)` returns `"[object List]"` instead of `"[object Object]"`. React Query's `hasObjectPrototype` returns `false`, so `isPlainObject` returns `false`, so `replaceEqualDeep` treats List as an opaque value (reference comparison only). No traversal, no recursion, instant return.

**Verified working:**

```typescript
const a = List.of(1, 2, 3)  // with Symbol.toStringTag
const b = List.of(1, 2, 3)

replaceEqualDeep(a, b) // Returns instantly, no crash
```

**Apply to all functype types:** List, Option, Either, Try, Set, Map, Tuple, etc.

### Fix 2: Convert Recursive Getters to Methods

Change getters that construct new functype objects to regular methods:

```typescript
// Before (getter — evaluated on property access during iteration)
get tail() {
  return ListObject(array.slice(1))
}

// After (method — just a function reference during iteration)
tail: () => ListObject(array.slice(1))
```

**Candidates for conversion:**
- `tail` → `tail()` — returns new List
- `init` → `init()` — returns new List
- `headOption` → `headOption()` — returns new Option
- `lastOption` → `lastOption()` — returns new Option

**Keep as getters** (safe — return primitives or existing refs):
- `size`, `length`, `isEmpty` — return primitives
- `head`, `last` — return existing array element references

**Note:** This is a breaking API change (`list.tail` → `list.tail()`). It fixes the infinite recursion but does NOT fix structural sharing (Fix 1 is still needed for that).

### Fix 3: Custom Prototype (Alternative to Fix 1)

Give functype types a shared prototype so `isPlainObject` returns `false`:

```typescript
const FunctypeProto = Object.create(Object.prototype)

const ListObject = <A>(values?: Iterable<A>): List<A> => {
  const array: A[] = Array.from(values ?? [])
  const list: List<A> = { /* ... */ }
  Object.setPrototypeOf(list, FunctypeProto)
  return list
}
```

**Downsides:**
- `Object.setPrototypeOf` triggers V8 deoptimization (slower property lookups)
- More invasive than `Symbol.toStringTag`
- Same result with more code

## Recommendation

**Fix 1 (`Symbol.toStringTag`) is the clear winner.** It's:
- 1 line per type, no structural changes
- Semantically correct (a List IS a List, not a plain Object)
- Compatible with all JavaScript environments
- No performance penalty
- No breaking API changes
- Fixes the problem for React Query and any other library that uses `isPlainObject` checks

Fix 2 (getter → method) is independently worth doing for API correctness (getters that compute new objects are surprising), but it's a breaking change and should be a separate decision.

## Affected Types

All functype types that are returned from React Query hooks need `Symbol.toStringTag`:

| Type | Tag Value | Has Recursive Getters |
|------|-----------|----------------------|
| List | `"List"` | Yes (`tail`, `init`, `headOption`, `lastOption`) |
| Option | `"Option"` | Possibly (depends on implementation) |
| Either | `"Either"` | Possibly |
| Try | `"Try"` | Possibly |
| Set | `"Set"` | Check implementation |
| Map | `"Map"` | Check implementation |
| Tuple | `"Tuple"` | Check implementation |

## Consumer-Side Workarounds (cq-ui)

Until functype is fixed, consuming apps can:

1. **Disable structural sharing** on queries returning functype types:
   ```typescript
   useQuery({
     queryKey: [...],
     queryFn: async () => { ... },
     structuralSharing: false,
   })
   ```

2. **Convert to arrays in queryFn** before returning:
   ```typescript
   queryFn: async () => {
     const list = await fetchSegments()
     return list.toArray()  // Plain array — structural sharing works
   }
   ```

3. **Add `staleTime`** to reduce refetch frequency (mitigates but doesn't fix).
