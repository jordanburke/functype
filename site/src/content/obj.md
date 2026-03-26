# Obj<T>

Immutable object wrapper with fluent operations.

## Overview

Obj wraps plain JavaScript objects and provides chainable, immutable operations for building and transforming them. It replaces imperative object mutation patterns (like `headers["key"] = value`) with a fluent functional API.

Obj uses `KVTraversable` — the same pattern as Map — because key-value containers can't freely transform their type parameter like Option or Either can. Map/flatMap are available but constrained to return Record types.

## Basic Usage

```typescript
import { Obj } from "functype/obj"

// Creating Obj instances
const user = Obj({ name: "John", age: 30 })
const empty = Obj.empty<{ name: string }>()
const fromOf = Obj.of({ x: 1, y: 2 })

// Accessing values
user.get("name") // Some("John")
user.value() // { name: "John", age: 30 }
user.has("name") // true
user.isEmpty // false
user.size // 2
```

## Object Operations

```typescript
const user = Obj({ name: "John", age: 30, role: "admin" })

// Set a single key (existing keys only)
user.set("age", 31)
// → Obj({ name: "John", age: 31, role: "admin" })

// Assign partial (same shape, no new keys)
user.assign({ name: "Jane", age: 25 })
// → Obj({ name: "Jane", age: 25, role: "admin" })

// Merge (can add new keys, widens type)
user.merge({ city: "NYC" })
// → Obj({ name: "John", age: 30, role: "admin", city: "NYC" })

// Conditional merge
user.when(isAdmin, { permissions: "all" })
// → merges only if isAdmin is true

// Pick specific keys
user.pick("name", "role")
// → Obj({ name: "John", role: "admin" })

// Omit specific keys
user.omit("role")
// → Obj({ name: "John", age: 30 })
```

## Conditional Building with `when`

The primary motivator for Obj — replacing imperative if/assign patterns:

```typescript
// Before: mutable
const headers: Record<string, string> = { "User-Agent": userAgent }
if (requiresAuth && accessToken) {
  headers["Authorization"] = `Bearer ${accessToken}`
}

// After: immutable and fluent
const headers = Obj({ "User-Agent": userAgent } as Record<string, string>)
  .assign({ "Content-Type": "application/json" })
  .when(requiresAuth, { Authorization: `Bearer ${accessToken}` })
  .value()
```

## Accessors

```typescript
const obj = Obj({ a: 1, b: 2, c: 3 })

obj.keys() // List(["a", "b", "c"])
obj.values() // List([1, 2, 3])
obj.entries() // List([Tuple(["a", 1]), Tuple(["b", 2]), Tuple(["c", 3])])
```

## Functype Interface

```typescript
// Fold
Obj({ x: 1 }).fold(
  () => "empty",
  (v) => `value: ${v.x}`,
) // "value: 1"

// Match
Obj({ x: 1 }).match({ Obj: (v) => v.x }) // 1

// Pipe
Obj({ x: 5 }).pipe((v) => v.x * 2) // 10

// Reshapeable
Obj({ x: 1 }).toOption() // Some({ x: 1 })
Obj({ x: 1 }).toEither("err") // Right({ x: 1 })

// Serialization
const json = Obj({ x: 1 }).serialize().toJSON()
Obj.fromJSON<{ x: number }>(json)
```

## Method Chaining

All operations return new Obj instances, enabling fluent chains:

```typescript
const result = Obj({ a: 1, b: 2, c: 3 }).set("a", 10).assign({ b: 20 }).omit("c").value()
// { a: 10, b: 20 }
```

## Companion Methods

| Method                   | Description                      |
| ------------------------ | -------------------------------- |
| `Obj(data)`              | Create from plain object         |
| `Obj.of(data)`           | Create from plain object (alias) |
| `Obj.empty()`            | Create empty Obj                 |
| `Obj.fromJSON(json)`     | Deserialize from JSON            |
| `Obj.fromBinary(binary)` | Deserialize from base64          |
