# Testing Patterns

Comprehensive testing strategies for functype development.

## Test Structure

### Standard Pattern

```typescript
import { describe, expect, it } from "vitest"
import { MyType } from "@/mytype"

describe("MyType", () => {
  describe("Construction", () => {
    it("should create from value", () => {
      // Arrange
      const value = 5

      // Act
      const result = MyType(value)

      // Assert
      expect(result.getValue()).toBe(5)
    })
  })

  describe("Interface Implementation", () => {
    // Group tests by interface
  })

  describe("Custom Methods", () => {
    // Test type-specific methods
  })

  describe("Edge Cases", () => {
    // Test null, undefined, empty
  })
})
```

## Testing Functional Interfaces

### Functor Laws

```typescript
describe("Functor Laws", () => {
  it("should satisfy identity law", () => {
    const fa = MyType(5)
    const identity = (x: any) => x

    expect(fa.map(identity)).toEqual(fa)
  })

  it("should satisfy composition law", () => {
    const fa = MyType(5)
    const f = (x: number) => x * 2
    const g = (x: number) => x + 1

    const left = fa.map(f).map(g)
    const right = fa.map((x) => g(f(x)))

    expect(left).toEqual(right)
  })
})
```

### Monad Laws

```typescript
describe("Monad Laws", () => {
  it("should satisfy left identity", () => {
    const a = 5
    const f = (x: number) => MyType(x * 2)

    expect(MyType(a).flatMap(f)).toEqual(f(a))
  })

  it("should satisfy right identity", () => {
    const m = MyType(5)

    expect(m.flatMap((x) => MyType(x))).toEqual(m)
  })

  it("should satisfy associativity", () => {
    const m = MyType(5)
    const f = (x: number) => MyType(x * 2)
    const g = (x: number) => MyType(x + 1)

    const left = m.flatMap(f).flatMap(g)
    const right = m.flatMap((x) => f(x).flatMap(g))

    expect(left).toEqual(right)
  })
})
```

### Applicative Laws

```typescript
describe("Applicative Laws", () => {
  it("should satisfy identity", () => {
    const v = MyType(5)
    const pure = MyType((x: number) => x)

    expect(v.ap(pure)).toEqual(v)
  })

  it("should satisfy homomorphism", () => {
    const f = (x: number) => x * 2
    const x = 5

    const left = MyType(x).ap(MyType(f))
    const right = MyType(f(x))

    expect(left).toEqual(right)
  })
})
```

## Property-Based Testing

### Using fast-check

```typescript
import { fc, test } from "@fast-check/vitest"

test.prop([fc.integer()])("map preserves structure", (n) => {
  const opt = Option(n)
  const result = opt.map((x) => x * 2)

  if (opt.isSome()) {
    expect(result.isSome()).toBe(true)
  } else {
    expect(result.isNone()).toBe(true)
  }
})

test.prop([fc.integer(), fc.integer()])("flatMap is associative", (a, b) => {
  const m = List([a, b])
  const f = (x: number) => List([x, x * 2])
  const g = (x: number) => List([x + 1])

  const left = m.flatMap(f).flatMap(g)
  const right = m.flatMap((x) => f(x).flatMap(g))

  expect(left.toArray()).toEqual(right.toArray())
})
```

### Custom Arbitraries

```typescript
import { fc } from "@fast-check/vitest"

// Generate Options
const optionArb = <T>(valueArb: fc.Arbitrary<T>): fc.Arbitrary<Option<T>> =>
  fc.oneof(
    fc.constant(Option.none()),
    valueArb.map((v) => Option(v)),
  )

// Generate Lists
const listArb = <T>(valueArb: fc.Arbitrary<T>): fc.Arbitrary<List<T>> => fc.array(valueArb).map((arr) => List(arr))

// Usage
test.prop([optionArb(fc.integer())])("option property", (opt) => {
  // Test with generated Options
})
```

## Edge Case Testing

### Null/Undefined

```typescript
describe("Edge Cases", () => {
  it("should handle null", () => {
    const value = Option(null)
    expect(value.isNone()).toBe(true)
  })

  it("should handle undefined", () => {
    const value = Option(undefined)
    expect(value.isNone()).toBe(true)
  })

  it("should handle zero", () => {
    const value = Option(0)
    expect(value.isSome()).toBe(true)
  })

  it("should handle empty string", () => {
    const value = Option("")
    expect(value.isSome()).toBe(true)
  })
})
```

### Type Inference

```typescript
describe("Type Inference", () => {
  it("should infer correct types", () => {
    const num: Option<number> = Option(5)
    const str: Option<string> = num.map((x) => x.toString())

    // TypeScript should not error
    const _check: string = str.orElse("")
  })
})
```

### Immutability

```typescript
describe("Immutability", () => {
  it("should not mutate original", () => {
    const original = List([1, 2, 3])
    const modified = original.append(4)

    expect(original.toArray()).toEqual([1, 2, 3])
    expect(modified.toArray()).toEqual([1, 2, 3, 4])
  })
})
```

## Integration Testing

### Type Composition

```typescript
describe("Type Composition", () => {
  it("should compose Option and Either", () => {
    const validate = (x: number): Either<string, number> => (x > 0 ? Right(x) : Left("Must be positive"))

    const result = Option(5)
      .map(validate)
      .fold(
        () => Left("No value"),
        (either) => either,
      )

    expect(result.isRight()).toBe(true)
  })
})
```

### Pipeline Testing

```typescript
describe("Pipelines", () => {
  it("should compose operations", () => {
    const result = List([1, 2, 3, 4, 5])
      .filter((x) => x > 2)
      .map((x) => x * 2)
      .foldLeft(0)((sum, x) => sum + x)

    expect(result).toBe(24) // (3 + 4 + 5) * 2 = 24
  })
})
```

## Performance Testing

### Benchmarks

```typescript
import { bench, describe } from "vitest"

describe("Performance", () => {
  bench("Option creation", () => {
    for (let i = 0; i < 1000; i++) {
      Option(i)
    }
  })

  bench("List operations", () => {
    const list = List(Array.from({ length: 1000 }, (_, i) => i))
    list.filter((x) => x % 2 === 0).map((x) => x * 2)
  })
})
```

## Test Organization

### File Structure

```
test/
├── option.spec.ts              # Option tests
├── either.spec.ts              # Either tests
├── list.spec.ts                # List tests
├── integration/                # Integration tests
│   ├── composition.spec.ts
│   └── pipelines.spec.ts
└── property/                   # Property-based tests
    ├── functor-laws.spec.ts
    └── monad-laws.spec.ts
```

### Naming Conventions

```typescript
// ✅ Good test names
it("should create Some from non-null value")
it("should return None when mapping over None")
it("should satisfy functor identity law")

// ❌ Poor test names
it("works")
it("test1")
it("should work correctly")
```

## Coverage

### Running Coverage

```bash
pnpm test:coverage
```

### Coverage Goals

- **Line coverage**: >90%
- **Branch coverage**: >85%
- **Function coverage**: >90%

### Uncovered Code

Some code is intentionally not covered:

- Error handling for impossible states
- Debug utilities
- Deprecated code

Mark with comments:

```typescript
/* istanbul ignore next */
if (impossibleCondition) {
  throw new Error("This should never happen")
}
```

## Continuous Testing

### Watch Mode

```bash
pnpm test:watch
```

### Pre-commit Hook

```bash
# .git/hooks/pre-commit
#!/bin/sh
pnpm test || exit 1
```

## Debugging Tests

### Verbose Output

```bash
pnpm vitest run test/mytype.spec.ts --reporter=verbose
```

### Focused Tests

```typescript
// Run only this test
it.only("should do something", () => {
  // ...
})

// Skip this test
it.skip("should do something else", () => {
  // ...
})
```

### Test Timeout

```typescript
it(
  "should handle slow operation",
  async () => {
    // ...
  },
  { timeout: 10000 },
) // 10 second timeout
```
