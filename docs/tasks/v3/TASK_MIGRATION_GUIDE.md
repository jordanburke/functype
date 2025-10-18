# Task Refactoring Migration Guide

This guide covers the migration from the previous Task implementation that inherited from Either to the new standalone Task implementation with explicit Ok/Err constructors.

## Overview of Changes

The Task implementation has been refactored to:

1. **Decouple from Either inheritance** - Task now uses its own `TaskOutcome<T>` interface
2. **Introduce Ok/Err constructors** - Explicit success and failure creation
3. **Standardize error access patterns** - Use `.error` instead of `.value` for failures
4. **Maintain Either compatibility** - All Either methods still work through interfaces
5. **Improve type safety** - Better TypeScript inference and type guards

## Breaking Changes

### 1. Error Access Pattern

**CRITICAL CHANGE**: Failed tasks now use `.error` instead of `.value`:

```typescript
// Before: Access error through .value
const result = await Task().Async(async () => {
  throw new Error("Something failed")
})
if (result.isFailure()) {
  console.error(result.value) // Was Throwable
}

// After: Access error through .error
const result = await Task().Async(async () => {
  throw new Error("Something failed")
})
if (result.isFailure()) {
  console.error(result.error) // Now Throwable
}
```

### 2. New Type Structure

| Component        | Type                | Purpose                               |
| ---------------- | ------------------- | ------------------------------------- |
| `TaskOutcome<T>` | `Ok<T> \| Err<T>`   | Union type for task results           |
| `Ok<T>`          | Success constructor | Represents successful task completion |
| `Err<T>`         | Failure constructor | Represents failed task completion     |

### 3. New Constructors Available

```typescript
import { Task, Ok, Err } from "functype"

// Explicit success
return Ok("success value")

// Explicit failure
return Err<string>("error message")

// Using with types
return Err<User>("User not found")
```

## Migration Steps

### Step 1: Update Error Access in Tests

**Most common change**: Update test assertions from `.value` to `.error`:

```typescript
// Before
expect(result.value).toBeInstanceOf(Error)
expect((result.value as Error).message).toBe("expected error")

// After
expect(result.error).toBeInstanceOf(Error)
expect(result.error.message).toBe("expected error")
```

### Step 2: Update Safe Value Access

Replace unsafe value access with `getOrThrow()`:

```typescript
// Before (potentially unsafe)
return result.value

// After (safe)
return result.orThrow()
```

### Step 3: Use New Type Guards

Prefer the new type guards for better type safety:

```typescript
// Before
if (result.isLeft()) {
  // result.value could be various types
}

// After - Better type inference
if (result.isFailure()) {
  // result.error is definitely Throwable
  console.error(result.error.message)
} else if (result.isSuccess()) {
  // result.value is definitely T
  console.log(result.value)
}
```

### Step 4: Update Nested Task Handling

```typescript
// Before: Nested tasks threw exceptions
const outerTask = Task().Sync(() => {
  const innerTask = Task().Sync(() => {
    throw new Error("Inner error")
  })
  return innerTask.orThrow() // This would throw
})

// After: Handle TaskOutcome explicitly
const outerTask = Task().Sync(() => {
  const innerTask = Task().Sync(() => {
    throw new Error("Inner error")
  })

  if (innerTask.isFailure()) {
    throw innerTask.error // Preserve error chain
  }

  return innerTask.value
})
```

## New Features Available

### 1. Explicit Ok/Err Returns

You can now explicitly control success/failure from within task functions:

```typescript
const result = await Task().Async(async () => {
  const response = await fetch("/api/data")

  if (!response.ok) {
    return Err<Data>(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  return Ok(data)
})
```

### 2. Enhanced Error Recovery

```typescript
const recoveredResult = result.recover("default value")
const recoveredWithFunction = result.recoverWith((error) => {
  console.log("Recovering from:", error.message)
  return "fallback value"
})
```

### 3. Better Error Transformation

```typescript
const mappedError = result.mapError((error) => {
  return new Error(`Enhanced: ${error.message}`)
})
```

## Complete Migration Example

### Before (Old Implementation)

```typescript
import { Task } from "functype"

// Test that expected .value for errors
describe("User Service", () => {
  it("should handle database errors", async () => {
    const result = await Task({ name: "FetchUser" }).Async(async () => {
      throw new Error("Database connection failed")
    })

    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(Error) // OLD: Used .value
    expect((result.value as Error).message).toBe("Database connection failed")
  })

  it("should chain tasks", () => {
    const result = Task().Sync(() => {
      const inner = Task().Sync(() => {
        throw new Error("Inner failure")
      })
      return inner.orThrow() // Could throw
    })

    expect(result.isFailure()).toBe(true)
    expect((result.value as Error).message).toContain("Inner failure")
  })
})
```

### After (New Implementation)

```typescript
import { Task, Ok, Err } from "functype"

describe("User Service", () => {
  it("should handle database errors", async () => {
    const result = await Task({ name: "FetchUser" }).Async(async () => {
      throw new Error("Database connection failed")
    })

    expect(result.isFailure()).toBe(true)
    expect(result.error).toBeInstanceOf(Error) // NEW: Use .error
    expect(result.error.message).toBe("Database connection failed")
  })

  it("should chain tasks with explicit error handling", () => {
    const result = Task().Sync(() => {
      const inner = Task().Sync(() => {
        throw new Error("Inner failure")
      })

      if (inner.isFailure()) {
        throw inner.error // Explicit error propagation
      }

      return inner.value
    })

    expect(result.isFailure()).toBe(true)
    expect(result.error.message).toContain("Inner failure")
  })

  it("should support explicit Ok/Err returns", async () => {
    const result = await Task().Async(async () => {
      const userData = await fetchUserData()

      if (!userData) {
        return Err<User>("User not found") // Explicit failure
      }

      return Ok(userData) // Explicit success
    })

    if (result.isSuccess()) {
      console.log("User data:", result.value)
    } else {
      console.error("Error:", result.error.message)
    }
  })
})
```

## Compatibility Notes

### Either Methods Still Work

The new Task implementation maintains full compatibility with Either methods:

```typescript
const result = Task.ok("value")

// All of these still work:
result.isLeft() // false
result.isRight() // true
result.fold(
  (error) => `Error: ${error}`,
  (value) => `Success: ${value}`,
)
result.map((v) => v.toUpperCase())
result.flatMap((v) => Right(v + "!"))
```

### New Type Guards Are Preferred

While `isLeft()`/`isRight()` still work, the new type guards provide better TypeScript inference:

```typescript
// Works but less type-safe
if (result.isLeft()) {
  // result.value has union type
}

// Preferred - better type narrowing
if (result.isFailure()) {
  // result.error is specifically Throwable
  console.error(result.error.message)
}
```

## Common Migration Patterns

### Pattern 1: Test Error Access

```typescript
// Find: result.value (in test contexts where result is expected to fail)
// Replace: result.error

// Before
expect((result.value as Error).message).toBe("expected")

// After
expect(result.error.message).toBe("expected")
```

### Pattern 2: Safe Value Extraction

```typescript
// Find: return result.value (where result might be success)
// Replace: return result.orThrow()

// Before (unsafe)
return result.value

// After (safe)
return result.orThrow()
```

### Pattern 3: Error Propagation

```typescript
// Find: throw result.value
// Replace: throw result.error

// Before
if (result.isFailure()) {
  throw result.value
}

// After
if (result.isFailure()) {
  throw result.error
}
```

## Verification Checklist

After migration, verify:

- [ ] All tests pass
- [ ] Error access uses `.error` instead of `.value`
- [ ] Success value access uses `.value` or `.orThrow()`
- [ ] TypeScript compilation succeeds without errors
- [ ] No runtime exceptions from incorrect property access

## Benefits of the New Implementation

1. **Clearer Intent**: Explicit Ok/Err constructors make success/failure intentions clear
2. **Better Type Safety**: `.error` and `.value` properties have specific types
3. **Preserved Compatibility**: All existing Either methods continue to work
4. **Enhanced Error Handling**: New recovery and transformation methods
5. **Improved Performance**: Standalone implementation without inheritance overhead

## Automated Migration Script

For large codebases, use these regex patterns in your IDE:

```regex
# Pattern 1: Update error access in tests
Find:    (result|task|outcome)\.value(?=.*Error|.*throw|.*instanceof)
Replace: $1.error

# Pattern 2: Update safe value access
Find:    return\s+(result|task|outcome)\.value(?!\s*as\s*Error)
Replace: return $1.orThrow()

# Pattern 3: Update error throwing
Find:    throw\s+(result|task|outcome)\.value
Replace: throw $1.error
```

**Note**: Always review automated changes manually to ensure correctness.

## Need Help?

If you encounter issues during migration:

1. Check that error access uses `.error` instead of `.value`
2. Ensure value access uses `.value` or `.orThrow()`
3. Verify that nested task error handling is explicit
4. Run tests to catch any remaining issues
5. Use TypeScript strict mode to catch type errors

The new Task implementation provides better type safety and clearer semantics while maintaining full backward compatibility with existing Either-based code.
