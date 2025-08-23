# Task v2 Migration Guide

## Overview

Task v2 introduces cleaner interfaces and better TypeScript support. The main changes are:

- Renamed types for clarity
- Proper type guards for type narrowing
- Interfaces that extend Either for full compatibility

## Breaking Changes

### Type Renames

| Old Name                       | New Name                                              | Purpose                      |
| ------------------------------ | ----------------------------------------------------- | ---------------------------- |
| `TaskException<T>`             | `TaskFailure<T>`                                      | Represents a failed task     |
| `TaskResult<T>` (success case) | `TaskSuccess<T>`                                      | Represents a successful task |
| `TaskResult<T>` (type)         | `TaskResult<T>` = `Promise<TaskOutcome<T>>`           | Async task result            |
| N/A                            | `TaskOutcome<T>` = `TaskSuccess<T> \| TaskFailure<T>` | Sync task result             |

### Property Changes

| Old Property | New Property | Location                            |
| ------------ | ------------ | ----------------------------------- |
| `_task`      | `_meta`      | On both TaskSuccess and TaskFailure |

## Migration Steps

### 1. Update Imports

```typescript
// Before
import { TaskException, TaskResult } from "functype"

// After
import { TaskFailure, TaskSuccess, TaskOutcome, TaskResult } from "functype"
```

### 2. Update Type References

#### Sync Operations

```typescript
// Before
function processTask(): TaskResult<string> | TaskException<string> {
  if (condition) {
    return TaskResult("success")
  }
  return TaskException(new Error("failed"))
}

// After
function processTask(): TaskOutcome<string> {
  if (condition) {
    return TaskSuccess("success")
  }
  return TaskFailure(new Error("failed"))
}
```

#### Async Operations

```typescript
// Before
async function asyncTask(): Promise<TaskResult<string> | TaskException<string>> {
  // ...
}

// After
async function asyncTask(): TaskResult<string> {
  // TaskResult is now Promise<TaskOutcome<T>>
  // ...
}
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

## Complete Migration Example

### Before

```typescript
import { Task, TaskException, TaskResult, isLeft, isRight } from "functype"

async function fetchUser(id: string): Promise<TaskResult<User> | TaskException<User>> {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      return TaskException(new Error("User not found"), undefined, {
        name: "FetchUser",
        description: "Failed to fetch user",
      })
    }
    const user = await response.json()
    return TaskResult(user, {
      name: "FetchUser",
      description: "Successfully fetched user",
    })
  } catch (error) {
    return TaskException(error, undefined, {
      name: "FetchUser",
      description: "Network error",
    })
  }
}

// Usage
const result = await fetchUser("123")
if (isLeft(result)) {
  console.error("Error:", result.value)
  console.log("Task:", result._task.name)
} else {
  console.log("User:", result.value)
}
```

### After

```typescript
import { Task, TaskFailure, TaskSuccess, TaskResult } from "functype"

async function fetchUser(id: string): TaskResult<User> {
  try {
    const response = await fetch(`/api/users/${id}`)
    if (!response.ok) {
      return TaskFailure(new Error("User not found"), undefined, {
        name: "FetchUser",
        description: "Failed to fetch user",
      })
    }
    const user = await response.json()
    return TaskSuccess(user, {
      name: "FetchUser",
      description: "Successfully fetched user",
    })
  } catch (error) {
    return TaskFailure(error, undefined, {
      name: "FetchUser",
      description: "Network error",
    })
  }
}

// Usage - Cleaner with Type Guards
const result = await fetchUser("123")
if (result.isFailure()) {
  // TypeScript knows this is TaskFailure<User>
  console.error("Error:", result.error.message)
  console.log("Task:", result._meta.name)

  // Can use Task-specific recovery methods
  const fallbackUser = result.recover(defaultUser)
} else {
  // TypeScript knows this is TaskSuccess<User>
  console.log("User:", result.value)

  // Can chain operations safely
  const userName = result.map((u) => u.name)
}
```

## Compatibility Notes

### Either Methods Still Work

Since `TaskSuccess` and `TaskFailure` extend Either, all Either methods are still available:

```typescript
const result = Task.success("value")

// These all still work:
result.isLeft() // false
result.isRight() // true
result.fold(
  (error) => `Failed: ${error}`,
  (value) => `Success: ${value}`,
)
result.map((v) => v.toUpperCase())
result.flatMap((v) => Task.success(v + "!"))
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

The new API is designed to be more intuitive while maintaining full backward compatibility with Either methods.
