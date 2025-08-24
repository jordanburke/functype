\_# Task v2 Migration Guide

## Overview

Task v2 introduces the **Ok/Err pattern** for explicit error handling, along with cleaner interfaces and better TypeScript support. The main changes are:

- **New Ok/Err constructors** for explicit success/failure returns
- **All Task operations now return `TaskOutcome<T>`** (no more mixed returns)
- **Auto-wrapping** of raw values and thrown errors
- **Error recovery** via Ok returns in error handlers
- Renamed types for clarity
- Proper type guards for type narrowing
- Interfaces that extend Either for full compatibility

## Breaking Changes

### New Return Type Behavior

**IMPORTANT**: `Task().Async()` now ALWAYS returns `TaskOutcome<T>`, never throws:

```typescript
// Before (v1): Could throw or return raw value
try {
  const result = await Task().Async(async () => "value") // Returns: string
} catch (error) {
  // Handle error
}

// After (v2): Always returns TaskOutcome
const result = await Task().Async(async () => "value") // Returns: TaskOutcome<string>
if (result.isSuccess()) {
  console.log(result.value) // "value"
} else {
  console.error(result.error)
}
```

### Type Renames

| Old Name                       | New Name                                              | Purpose                      |
| ------------------------------ | ----------------------------------------------------- | ---------------------------- |
| `TaskException<T>`             | `TaskFailure<T>`                                      | Represents a failed task     |
| `TaskResult<T>` (success case) | `TaskSuccess<T>`                                      | Represents a successful task |
| `TaskResult<T>` (type)         | `TaskResult<T>` = `Promise<TaskOutcome<T>>`           | Async task result            |
| N/A                            | `TaskOutcome<T>` = `TaskSuccess<T> \| TaskFailure<T>` | Sync task result             |

### New Constructors

| Constructor       | Purpose                      | Example                        |
| ----------------- | ---------------------------- | ------------------------------ |
| `Ok<T>(value)`    | Create explicit success      | `return Ok("success")`         |
| `Err<T>(error)`   | Create explicit failure      | `return Err<string>("failed")` |
| `Task.ok(value)`  | Companion method for success | `Task.ok(42)`                  |
| `Task.err(error)` | Companion method for failure | `Task.err("error")`            |

### Property Changes

| Old Property | New Property | Location                            |
| ------------ | ------------ | ----------------------------------- |
| `_task`      | `_meta`      | On both TaskSuccess and TaskFailure |

## Migration Steps

### 1. Update Imports

```typescript
// Before (v1)
import { Task } from "functype"

// After (v2) - include Ok/Err for explicit control
import { Task, Ok, Err, type TaskOutcome } from "functype"
```

### 2. Update Error Handling Patterns

#### From try-catch to TaskOutcome checking

```typescript
// Before (v1): Used try-catch with Task
try {
  const result = await Task().Async(async () => {
    return await fetchData()
  })
  console.log(result) // Raw value
} catch (error) {
  console.error("Failed:", error)
}

// After (v2): Check TaskOutcome
const result = await Task().Async(async () => {
  return await fetchData()
})

if (result.isSuccess()) {
  console.log(result.value) // Access success value
} else {
  console.error("Failed:", result.error) // Access error
}
```

#### Using Ok/Err for explicit control

```typescript
// New pattern: Explicit Ok/Err returns
const result = await Task().Async(async (): Promise<TaskOutcome<User>> => {
  const response = await fetch("/api/user")

  if (!response.ok) {
    return Err<User>(`HTTP ${response.status}`) // Explicit failure
  }

  const user = await response.json()
  return Ok(user) // Explicit success
})

// Error recovery with Ok
const recovered = await Task().Async(
  async () => {
    throw new Error("network error")
  },
  async (error) => {
    // Recover with cached data
    return Ok(getCachedUser()) // Recovery!
  },
)
```

### 3. Update Property Access

```typescript
// Before
if (result._task) {
  console.log(result._task.name)
}

// After
if (result._meta) {
  console.log(result._meta.name)
}
```

### 4. Use Type Guards Instead of Either Utilities

While `isLeft()` and `isRight()` still work (due to Either compatibility), prefer the new type guards:

```typescript
// Before
import { isLeft, isRight } from "functype"

if (isLeft(result)) {
  console.log(result.value) // Throwable
} else if (isRight(result)) {
  console.log(result.value) // Success value
}

// After - Better Type Safety
if (result.isFailure()) {
  console.log(result.error) // Direct access to error
} else if (result.isSuccess()) {
  console.log(result.value) // Direct access to value
  console.log(result.get()) // Alternative accessor
}
```

### 5. Update Error Handling Patterns

```typescript
// Before
const handleResult = (result: TaskResult<string> | TaskException<string>) => {
  if (result._tag === "TaskException") {
    // Handle error
    const error = result.value as Throwable
  } else {
    // Handle success
    const value = result.value as string
  }
}

// After - With Type Guards
const handleResult = (result: TaskOutcome<string>) => {
  if (result.isFailure()) {
    // TypeScript knows this is TaskFailure<string>
    console.error(result.error.message)
    const recovered = result.recover("default") // Task-specific methods available
  } else {
    // TypeScript knows this is TaskSuccess<string>
    console.log(result.value)
    const mapped = result.map((s) => s.toUpperCase())
  }
}
```

### 6. Handle Nested Tasks

```typescript
// Before (v1): Nested tasks could throw
try {
  const result = await Task().Async(async () => {
    const innerResult = await Task().Async(async () => {
      return "inner value"
    })
    return innerResult // Could throw if inner failed
  })
} catch (error) {
  // Handle error from either task
}

// After (v2): Explicitly handle TaskOutcome
const result = await Task().Async(async () => {
  const innerResult = await Task().Async(async () => {
    return "inner value"
  })

  // Must explicitly handle the inner TaskOutcome
  if (innerResult.isFailure()) {
    return innerResult // Propagate failure
    // OR throw to preserve error chain:
    // throw innerResult.value
  }

  return Ok(innerResult.value) // Wrap in Ok
})
```

## Complete Migration Example

### Before (v1)

```typescript
import { Task } from "functype"

async function fetchUser(id: string) {
  try {
    const user = await Task({ name: "FetchUser" }).Async(async () => {
      const response = await fetch(`/api/users/${id}`)
      if (!response.ok) {
        throw new Error("User not found")
      }
      return response.json()
    })
    return user // Raw User object
  } catch (error) {
    console.error("Failed to fetch user:", error)
    throw error
  }
}

// Usage
try {
  const user = await fetchUser("123")
  console.log("User:", user)
} catch (error) {
  console.error("Failed:", error)
}
```

### After (v2)

```typescript
import { Task, Ok, Err, type TaskOutcome } from "functype"

async function fetchUser(id: string): Promise<TaskOutcome<User>> {
  return Task({ name: "FetchUser" }).Async(async () => {
    const response = await fetch(`/api/users/${id}`)

    if (!response.ok) {
      return Err<User>(`User not found: ${response.status}`)
    }

    const user = await response.json()
    return Ok(user) // Explicit success
  })
}

// Usage
const result = await fetchUser("123")
if (result.isSuccess()) {
  console.log("User:", result.value)
  console.log("Task:", result._meta.name)
} else {
  console.error("Error:", result.error.message)
  console.log("Task:", result._meta.name)
}
```

## Key Benefits of v2

1. **Consistent Returns**: `Task().Async()` always returns `TaskOutcome<T>`, no more mixed behaviors
2. **Explicit Control**: Use `Ok`/`Err` to explicitly return success or failure from any point
3. **Error Recovery**: Error handlers can return `Ok` to recover from errors
4. **Better Composition**: Works seamlessly with Either/Option patterns
5. **Type Safety**: TypeScript always knows whether you're dealing with success or failure

## Quick Reference

| Pattern          | Description                     | Example                           |
| ---------------- | ------------------------------- | --------------------------------- |
| Auto-wrap value  | Raw values become `Ok`          | `return "value"` → `Ok("value")`  |
| Auto-wrap error  | Thrown errors become `Err`      | `throw error` → `Err(error)`      |
| Explicit success | Return `Ok` directly            | `return Ok(data)`                 |
| Explicit failure | Return `Err` directly           | `return Err<T>("failed")`         |
| Error recovery   | Return `Ok` in error handler    | `async (error) => Ok(fallback)`   |
| Check result     | Use `isSuccess()`/`isFailure()` | `if (result.isSuccess()) { ... }` |
| Access value     | Use `.value` or `.get()`        | `result.value` or `result.get()`  |
| Access error     | Use `.error`                    | `result.error.message`            |

## Compatibility Notes

### Either Methods Still Work

Since `TaskSuccess` and `TaskFailure` extend Either, all Either methods are still available:

```typescript
const result = Task.ok("value")

// These all still work:
result.isLeft() // false
result.isRight() // true
result.fold(
  (error) => `Failed: ${error}`,
  (value) => `Success: ${value}`,
)
result.map((v) => v.toUpperCase())
result.flatMap((v) => Task.ok(v + "!"))
```

### Using with Either Utilities

```typescript
import { isLeft, isRight } from "functype"

// Still works, but less type-safe than type guards
if (isLeft(result)) {
  // result.value is Throwable | T (union type)
}

// Prefer type guards for better type narrowing
if (result.isFailure()) {
  // result.error is Throwable (specific type)
}
```

## Benefits of Migration

1. **Better Type Safety**: Type guards provide proper TypeScript narrowing
2. **Clearer API**: `TaskSuccess`/`TaskFailure` is more intuitive than `TaskResult`/`TaskException`
3. **Direct Property Access**: `result.error` instead of casting `result.value`
4. **Task-Specific Methods**: `recover()`, `recoverWith()`, `mapError()` on failures
5. **Performance**: Interfaces compile faster than intersection types

## Automated Migration Script

For large codebases, you can use these regex patterns for find/replace:

```javascript
// VS Code find/replace patterns (enable regex mode)

// 1. Import statements
Find:    import \{([^}]*)\bTaskException\b([^}]*)\}
Replace: import {$1TaskFailure$2}

Find:    import \{([^}]*)\bTaskResult\b([^}]*)\}
Replace: import {$1TaskSuccess$2}

// 2. Type declarations
Find:    TaskException<(\w+)>
Replace: TaskFailure<$1>

Find:    TaskResult<(\w+)>\s*\|\s*TaskException<\w+>
Replace: TaskOutcome<$1>

// 3. Constructor calls
Find:    TaskException\(
Replace: TaskFailure(

Find:    TaskResult\(
Replace: TaskSuccess(

// 4. Property access
Find:    \._task\.
Replace: ._meta.

// 5. Type checks (optional - manual review recommended)
Find:    isLeft\((\w+)\)
Replace: $1.isFailure()

Find:    isRight\((\w+)\)
Replace: $1.isSuccess()
```

## Need Help?

If you encounter any issues during migration:

1. Check that all imports are updated
2. Ensure TypeScript is version 4.5+ for best type guard support
3. Run your tests to catch any runtime issues
4. Use `TaskOutcome<T>` for sync, `TaskResult<T>` for async

The new API is designed to be more intuitive while maintaining full backward compatibility with Either methods.\_
