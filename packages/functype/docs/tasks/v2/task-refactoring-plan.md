# Task v2 Refactoring Plan

## Overview

This document outlines the refactoring of the Task module from using `Either<Throwable, T> & TaskInfo` type aliases to dedicated `TaskSuccess<T>` and `TaskFailure<T>` interfaces. This change improves type safety, compiler performance, and API clarity.

## Motivation

### Current Issues

1. **Type Alias Complexity**: Current `TaskResult` and `TaskException` are type aliases using intersections (`Either<Throwable, T> & TaskInfo`)
2. **Naming Confusion**: `TaskResult` suggests the outcome but is actually just the success case
3. **Redundant Structure**: `TaskInfo` duplicates `name` and `description` fields
4. **Compiler Performance**: Intersection types are slower to type-check than interfaces
5. **API Clarity**: Unclear which methods from Either are relevant for Task operations

### Benefits of Interface Approach

1. **Better Type Inference**: ~2-3x faster type-checking with interfaces vs intersections
2. **Superior Type Narrowing**: Discriminated unions with `_tag` enable instant narrowing
3. **Cleaner Error Messages**: Simple types produce more readable compiler errors
4. **Better Tree-Shaking**: Bundlers can optimize better with explicit interfaces
5. **Clear API Surface**: Only include methods that make sense for Task operations

## Design

### Core Types

```typescript
// Input parameters (optional)
export interface TaskParams {
  readonly name?: string
  readonly description?: string
}

// Resolved metadata (required)
export interface TaskMetadata {
  readonly name: string
  readonly description: string
}

// Success case
export interface TaskSuccess<T> {
  readonly _tag: "TaskSuccess"
  readonly _meta: TaskMetadata
  readonly value: T
  readonly isSuccess: () => true
  readonly isFailure: () => false
  // Extraction methods
  readonly get: () => T
  readonly getOrElse: (defaultValue: T) => T
  readonly getOrThrow: () => T
  // Transformation methods
  readonly map: <U>(f: (value: T) => U) => TaskSuccess<U>
  readonly flatMap: <U>(f: (value: T) => TaskOutcome<U>) => TaskOutcome<U>
  readonly fold: <U>(onFailure: (error: Throwable) => U, onSuccess: (value: T) => U) => U
  // Utility methods
  readonly toEither: () => Either<Throwable, T>
  readonly pipe: <U>(f: (value: T) => U) => U
}

// Failure case
export interface TaskFailure<T> {
  readonly _tag: "TaskFailure"
  readonly _meta: TaskMetadata
  readonly error: Throwable
  readonly isSuccess: () => false
  readonly isFailure: () => true
  // Extraction methods
  readonly get: () => never
  readonly getOrElse: (defaultValue: T) => T
  readonly getOrThrow: () => never
  // Transformation methods
  readonly map: <U>(f: (value: T) => U) => TaskFailure<U>
  readonly flatMap: <U>(f: (value: T) => TaskOutcome<U>) => TaskFailure<U>
  readonly fold: <U>(onFailure: (error: Throwable) => U, onSuccess: (value: T) => U) => U
  // Error-specific methods
  readonly mapError: (f: (error: Throwable) => Throwable) => TaskFailure<T>
  readonly recover: (value: T) => TaskSuccess<T>
  readonly recoverWith: (f: (error: Throwable) => T) => TaskSuccess<T>
  // Utility methods
  readonly toEither: () => Either<Throwable, T>
  readonly pipe: <U>(f: (error: Throwable) => U) => U
}

// Union type for sync operations
export type TaskOutcome<T> = TaskSuccess<T> | TaskFailure<T>

// Promise wrapper for async operations
export type TaskResult<T> = Promise<TaskOutcome<T>>
```

### Error Context Preservation

The `TaskMetadata` is passed to `Throwable.apply()` to maintain error chain tracking:

```typescript
export const TaskFailure = <T>(error: unknown, data?: unknown, params?: TaskParams): TaskFailure<T> => {
  const meta: TaskMetadata = {
    name: params?.name ?? "Task",
    description: params?.description ?? "",
  }

  // Pass metadata to Throwable for error chain tracking
  const throwable = Throwable.apply(error, data, meta)

  return {
    _tag: "TaskFailure",
    _meta: meta,
    error: throwable,
    // ... methods
  }
}
```

## Migration Strategy

### Phase 1: Add New Interfaces

1. Create new `TaskSuccess` and `TaskFailure` interfaces
2. Create `TaskOutcome` union type
3. Redefine `TaskResult` as `Promise<TaskOutcome<T>>`
4. Keep old `TaskException` and current `TaskResult` as deprecated aliases

### Phase 2: Update Internal Usage

1. Update `Task.Sync` to return `TaskOutcome<T>`
2. Update `Task.Async` to return `TaskResult<T>` (Promise-wrapped)
3. Update companion methods to use new types

### Phase 3: Update Tests

1. Update test files to use new interfaces
2. Ensure error chain tests still pass
3. Verify type narrowing works correctly

### Phase 4: Deprecate Old Types

1. Mark `TaskException` as deprecated
2. Mark old `TaskResult` type as deprecated
3. Add migration notes in JSDoc comments

## Usage Examples

### Sync Operations

```typescript
const result: TaskOutcome<string> = Task().Sync(() => {
  if (Math.random() > 0.5) {
    return "success"
  }
  throw new Error("Random failure")
})

// Type narrowing
if (result.isSuccess()) {
  console.log(result.value) // TypeScript knows this is available
} else {
  console.log(result.error.message) // TypeScript knows this is available
}

// Pattern matching
const message = result.fold(
  (error) => `Failed: ${error.message}`,
  (value) => `Success: ${value}`,
)
```

### Async Operations

```typescript
const searchTask: TaskResult<SearchResponse> = customSearch(options)

const outcome = await searchTask
if (outcome.isSuccess()) {
  processResponse(outcome.value)
} else {
  logger.error(outcome.error)
}
```

### Error Chain Preservation

```typescript
const innerTask = Task({ name: "InnerTask" }).Async<string>(async () => {
  throw new Error("Inner failure")
})

const outerTask = Task({ name: "OuterTask" }).Async<string>(async () => {
  return await innerTask
})

try {
  await outerTask
} catch (error) {
  // Error chain is preserved through TaskMetadata -> Throwable
  const chain = Task.getErrorChain(error as Error)
  // chain[0]: OuterTask error
  // chain[1]: InnerTask error (as cause)
}
```

## Backwards Compatibility

To maintain compatibility:

1. Keep `TaskException` as deprecated alias pointing to `TaskFailure`
2. Add conversion methods on interfaces if needed
3. Ensure Throwable integration remains unchanged
4. Preserve error chain functionality

## Performance Improvements

Expected improvements from this refactoring:

- **Type Checking**: 2-3x faster for discriminated unions vs intersections
- **IDE Performance**: Faster IntelliSense and autocomplete
- **Bundle Size**: Better tree-shaking with explicit interfaces
- **Runtime**: No runtime performance changes (types are compile-time only)

## Implementation Checklist

- [ ] Create new interface definitions
- [ ] Implement constructor functions
- [ ] Update Task.Sync to use TaskOutcome
- [ ] Update Task.Async to use TaskResult
- [ ] Update companion methods
- [ ] Add deprecation notices
- [ ] Update tests
- [ ] Update documentation
- [ ] Update FUNCTYPE_FEATURE_MATRIX.md
