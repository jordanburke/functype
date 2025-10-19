# Adding New Data Structures

Step-by-step guide for adding new types to functype.

## Complete Workflow

### 1. Planning

Before coding, answer these questions:

- **What problem does this type solve?**
- **Which functional interfaces should it implement?** (Check Feature Matrix)
- **What are the key operations?**
- **Are there similar types to reference?** (Option, Either, List)

### 2. Create Module Structure

```bash
# Create directories
mkdir -p src/mynewtype
mkdir -p test

# Create files
touch src/mynewtype/index.ts
touch test/mynewtype.spec.ts
```

### 3. Define Type Interface

```typescript
// src/mynewtype/index.ts
import type { Functor } from "@/functor"
import type { Foldable } from "@/foldable"

export type MyNewType<T> = Functor<T> & Foldable<T> & {
  // Core operations
  getValue(): T
  isEmpty(): boolean

  // Additional methods
  filter(predicate: (value: T) => boolean): MyNewType<T>
}
```

### 4. Implement Constructor

```typescript
import { Base } from "@/core/base"

export function MyNew<T>(value: T): MyNewType<T> {
  return Base("MyNewType", {
    // Functor
    map: <B>(f: (val: T) => B): MyNewType<B> => {
      return MyNew(f(value))
    },

    // Foldable
    fold: <B>(onEmpty: () => B, onValue: (val: T) => B): B => {
      return value == null ? onEmpty() : onValue(value)
    },

    foldLeft: <B>(z: B) => (op: (b: B, a: T) => B): B => {
      return value == null ? z : op(z, value)
    },

    foldRight: <B>(z: B) => (op: (a: T, b: B) => B): B => {
      return value == null ? z : op(value, z)
    },

    // Custom methods
    getValue: () => value,
    isEmpty: () => value == null,
    filter: (predicate: (val: T) => boolean) => {
      return predicate(value) ? MyNew(value) : MyNew(null as any)
    },

    // Pipe for composition
    pipe: () => ({
      map: (f: (val: T) => any) => MyNew(value).map(f),
      filter: (p: (val: T) => boolean) => MyNew(value).filter(p),
    }),
  })
}
```

### 5. Add Companion Methods

```typescript
// Static factory methods
MyNew.empty = <T>(): MyNewType<T> => MyNew<T>(null as any)

MyNew.from = <T>(value: T | null | undefined): MyNewType<T> => {
  return MyNew(value ?? null as any)
}

MyNew.of = <T>(value: T): MyNewType<T> => MyNew(value)
```

### 6. Add Exports

**Update `src/index.ts`:**
```typescript
export { MyNew } from "./mynewtype"
export type { MyNewType } from "./mynewtype"
```

**Update `package.json` exports:**
```json
{
  "exports": {
    "./mynewtype": {
      "import": "./dist/esm/mynewtype/index.js",
      "require": "./dist/cjs/mynewtype/index.js",
      "types": "./dist/types/mynewtype/index.d.ts"
    }
  }
}
```

### 7. Write Tests

```typescript
// test/mynewtype.spec.ts
import { describe, expect, it } from "vitest"
import { MyNew } from "@/mynewtype"

describe("MyNewType", () => {
  describe("Construction", () => {
    it("should create from value", () => {
      const value = MyNew(5)
      expect(value.getValue()).toBe(5)
      expect(value.isEmpty()).toBe(false)
    })

    it("should create empty", () => {
      const empty = MyNew.empty<number>()
      expect(empty.isEmpty()).toBe(true)
    })
  })

  describe("Functor", () => {
    it("should map over values", () => {
      const result = MyNew(5).map(x => x * 2)
      expect(result.getValue()).toBe(10)
    })

    it("should satisfy identity law", () => {
      const value = MyNew(5)
      expect(value.map(x => x)).toEqual(value)
    })

    it("should satisfy composition law", () => {
      const value = MyNew(5)
      const f = (x: number) => x * 2
      const g = (x: number) => x + 1

      expect(value.map(f).map(g)).toEqual(value.map(x => g(f(x))))
    })
  })

  describe("Foldable", () => {
    it("should fold with value", () => {
      const result = MyNew(5).fold(
        () => "empty",
        x => `value: ${x}`
      )
      expect(result).toBe("value: 5")
    })

    it("should fold when empty", () => {
      const result = MyNew.empty<number>().fold(
        () => "empty",
        x => `value: ${x}`
      )
      expect(result).toBe("empty")
    })
  })

  describe("Custom Methods", () => {
    it("should filter values", () => {
      const value = MyNew(5)
      expect(value.filter(x => x > 3).getValue()).toBe(5)
      expect(value.filter(x => x > 10).isEmpty()).toBe(true)
    })
  })

  describe("Edge Cases", () => {
    it("should handle null", () => {
      const value = MyNew(null)
      expect(value.isEmpty()).toBe(true)
    })

    it("should handle undefined", () => {
      const value = MyNew(undefined)
      expect(value.isEmpty()).toBe(true)
    })
  })
})
```

### 8. Update Documentation

**Add to Feature Matrix (`docs/FUNCTYPE_FEATURE_MATRIX.md`):**

```markdown
| **MyNewType<T>** |  ✓  |  ✓  |  ✓  |  ...  |
```

**Add help file (optional):**
```json
// src/mynewtype/mynewtype.help.json
{
  "name": "MyNewType",
  "description": "Brief description of the type",
  "examples": [
    {
      "title": "Basic Usage",
      "code": "const value = MyNew(5)"
    }
  ]
}
```

### 9. Validate

```bash
pnpm validate
```

This runs:
- Format check
- Lint check
- All tests
- Production build

## Interface Implementation Guide

### Implementing Monad

If your type should support `flatMap`:

```typescript
export type MyNewType<T> = Functor<T> & Monad<T> & {
  // ...
}

export function MyNew<T>(value: T): MyNewType<T> {
  return Base("MyNewType", {
    // ... other methods

    flatMap: <B>(f: (val: T) => MyNewType<B>): MyNewType<B> => {
      return value == null ? MyNew.empty<B>() : f(value)
    },
  })
}
```

### Implementing Serializable

```typescript
import { createSerializable } from "@/core/serializable"

export function MyNew<T>(value: T): MyNewType<T> {
  return Base("MyNewType", {
    // ... other methods

    serialize: () => createSerializable({
      type: "MyNewType",
      value: value,
    }),
  })
}
```

### Implementing Traversable (for collections)

```typescript
export function MyNewCollection<T>(items: T[]): MyNewCollectionType<T> {
  return Base("MyNewCollection", {
    // ... other methods

    size: items.length,
    isEmpty: items.length === 0,
    contains: (value: T) => items.includes(value),
    reduce: <B>(f: (acc: B, val: T) => B, initial: B): B => {
      return items.reduce(f, initial)
    },
  })
}
```

## Common Patterns

### Handling Multiple Cases

```typescript
export function MyNew<T>(value: T): MyNewType<T> {
  // Empty case
  if (value == null) {
    return Base("Empty", {
      map: <B>(_f: (val: T) => B) => MyNew.empty<B>(),
      // ... empty implementations
    })
  }

  // Value case
  return Base("Value", {
    map: <B>(f: (val: T) => B) => MyNew(f(value)),
    // ... value implementations
  })
}
```

### Adding Type Guards

```typescript
export type MyNewType<T> = {
  // ... other methods
  isEmpty(): boolean
  hasValue(): boolean
}

export function MyNew<T>(value: T): MyNewType<T> {
  return Base("MyNewType", {
    // ... other methods
    isEmpty: () => value == null,
    hasValue: () => value != null,
  })
}
```

### Companion Pattern with TypeScript

```typescript
import { Companion } from "@/core/companion"

function MyNewConstructor<T>(value: T): MyNewType<T> {
  // ... implementation
}

const MyNewCompanion = {
  empty: <T>() => MyNewConstructor<T>(null as any),
  of: <T>(value: T) => MyNewConstructor(value),
  from: <T>(source: any) => MyNewConstructor<T>(/* convert source */),
}

export const MyNew = Companion(MyNewConstructor, MyNewCompanion)
```

## Checklist

Before submitting:

- [ ] Type interface defined with all required methods
- [ ] Constructor implemented using Base pattern
- [ ] All functional interfaces implemented correctly
- [ ] Companion methods added (empty, from, of, etc.)
- [ ] Exports added to src/index.ts
- [ ] Package.json exports configured
- [ ] Comprehensive tests written
- [ ] Edge cases tested (null, undefined, empty)
- [ ] Functor/Monad laws tested
- [ ] Feature Matrix updated
- [ ] `pnpm validate` passes
- [ ] Documentation added (optional help file)