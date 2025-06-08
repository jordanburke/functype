# Task Error Handling

The `Task` module in Functype provides robust error handling capabilities, including the ability to include task identifiers in error objects. This guide explains how to take advantage of these features.

## Named Task Errors

When creating a `Task`, you can provide an optional name and description:

```typescript
const namedTask = Task({
  name: "UserRegistration",
  description: "Handles user registration process",
})
```

When an error occurs within this task, the task name will be referenced in the error:

1. The `Throwable` object created from the error will include:

   - The task name as the error's `name` property
   - A `taskInfo` property containing both the name and description

2. The `TaskException` object will include:
   - The `_task` property with the name and description
   - The original error wrapped with the task name and info

## Examples

### Sync Task Error

```typescript
const namedTask = Task({ name: "UserRegistration" })

const result = namedTask.Sync(() => {
  throw new Error("Invalid user data")
})

// The error (within the Left) will have:
// - name: "UserRegistration"
// - message: "Invalid user data"
// - taskInfo: { name: "UserRegistration", description: "..." }

console.log(result.value.name) // "UserRegistration"
console.log(result._task.name) // "UserRegistration"
```

### Async Task Error

```typescript
try {
  await Task({ name: "DataProcessing" }).Async(async () => {
    throw new Error("Processing failed")
  })
} catch (error) {
  // The error will have:
  // - name: "DataProcessing"
  // - message: "Processing failed"
  // - taskInfo: { name: "DataProcessing", description: "..." }

  console.log(error.name) // "DataProcessing"
  console.log(error.taskInfo) // { name: "DataProcessing", description: "..." }
}
```

### Using Task.fail Companion Function

```typescript
const error = new Error("Authentication failed")
const result = Task.fail(error, { userId: 123 }, { name: "AuthService" })

// The TaskException contains:
console.log(result.value.name) // "AuthService"
console.log(result.value.message) // "Authentication failed"
console.log(result.value.data) // { userId: 123 }
console.log(result.value.taskInfo) // { name: "AuthService", description: "..." }
```

## Benefits

Including task names in errors provides several advantages:

1. **Better Error Identification**: Easily identify which task produced an error
2. **Improved Debugging**: Quickly locate the source of exceptions
3. **Enhanced Logging**: Structured error information for logs and monitoring
4. **Error Context**: Maintain context about what operation was being performed
5. **Consistent Error Format**: All errors follow the same structure

## Error Propagation

Task names and information propagate through the error handling chain:

```typescript
const result = Task({ name: "UserService" }).Sync(
  () => {
    throw new Error("User not found")
  },
  (error) => `Could not process request: ${error.message}`,
)

// The resulting error maintains the task name even through the error handler
console.log(result.value.name) // "UserService"
console.log(result.value.message) // "Could not process request: User not found"
```

## With finally Blocks

Task names are preserved even when errors occur in finally blocks:

```typescript
try {
  await Task({ name: "CleanupTask" }).Async(
    async () => "success",
    async (error) => error,
    () => {
      throw new Error("Cleanup failed")
    },
  )
} catch (error) {
  // The error from the finally block still includes the task name
  console.log(error.name) // "CleanupTask"
  console.log(error.message) // "Cleanup failed"
}
```

## Context Loss in Nested Tasks

When working with multiple nested `Task` executions, there's a significant issue with error context preservation. Inner task errors lose their context when they propagate through outer tasks. This limits error traceability and makes debugging complex task chains difficult.

### Current Behavior

Consider this example:

```typescript
// Inner task with specific context
const innerTask = Task({ name: "InnerTask" }).Async(async () => {
  throw new Error("Inner failure")
})

// Outer task that calls the inner task
const outerTask = Task({ name: "OuterTask" }).Async(async () => await innerTask)

try {
  await outerTask
} catch (error) {
  // error.taskInfo.name will be "OuterTask", not "InnerTask"
  // The original error context is lost
}
```

In this scenario, the error context from the `InnerTask` is lost when it propagates through the `OuterTask`. This makes it difficult to:

1. Identify the actual source of errors
2. Implement proper error handling strategies
3. Debug complex nested task chains

### Current Workaround

Until a native solution is implemented, you can manually preserve the error context:

```typescript
// Outer task with manual error handling
const outerTask = Task({ name: "OuterTask" }).Async(async () => {
  try {
    return await innerTask
  } catch (innerError) {
    // Manually reference the inner error
    throw new Error(`OuterTask failed: ${(innerError as Error).message}`)
  }
})
```

## Implemented Solution: Error Chaining

The `Task` implementation now supports error chaining, preserving the complete error context chain as errors propagate through nested tasks.

### How Error Chaining Works

The `Task` implementation now detects when an error comes from another task and preserves the error chain by:

1. Creating a new error with the outer task's context
2. Setting the inner task's error as the `cause` property
3. Preserving the complete error chain for debugging and error handling

```typescript
// Inner task with specific context
const innerTask = Task({ name: "InnerTask" }).Async(async () => {
  throw new Error("Inner failure")
})

// Outer task that calls the inner task
const outerTask = Task({ name: "OuterTask" }).Async(async () => await innerTask)

try {
  await outerTask
} catch (error) {
  // error.taskInfo.name will be "OuterTask"
  // But error.cause.taskInfo.name will be "InnerTask"

  // You can access the full error chain
  const errorChain = Task.getErrorChain(error)

  // Format the error chain for logging/debugging
  const formattedError = Task.formatErrorChain(error, { includeTasks: true })
  console.log(formattedError)
  // Output:
  // [OuterTask] OuterTask: Inner failure
  // ↳ [InnerTask] Inner failure
}
```

### Task.getErrorChain

A new utility method allows you to extract the complete error chain from a Throwable error:

```typescript
// Get array of errors from outer to inner
const errorChain = Task.getErrorChain(error)

// Access specific task information
console.log(errorChain[0].taskInfo.name) // "OuterTask"
console.log(errorChain[1].taskInfo.name) // "InnerTask"
```

### Task.formatErrorChain

Another utility method formats the error chain as a readable string for logging or debugging:

```typescript
// Format with task names included
const formatted = Task.formatErrorChain(error, {
  includeTasks: true, // Include task names in formatted output
  separator: "\n", // Separator between error levels (default: "\n")
  includeStackTrace: false, // Whether to include stack traces (default: false)
})

console.log(formatted)
// Output:
// [OuterTask] OuterTask: Inner failure
// ↳ [InnerTask] Inner failure
```

### Benefits

This implementation provides several advantages:

1. **Full Context Preservation**: Every level of the error chain maintains its task context
2. **Improved Debugging**: Error messages include the full path of the error
3. **Better Error Handling**: Error handlers can make decisions based on the complete error chain
4. **Minimal Performance Impact**: The solution adds negligible overhead
5. **Backwards Compatibility**: Existing code will continue to work as before

An error chain is formatted like this by default:

```
[OuterTask] Failed to process data
↳ [MiddleTask] Database query failed
↳ [InnerTask] Connection timeout
```

## Error Handler Behavior

When using `Task.Async`, error handlers are always called, regardless of the error type:

```typescript
const task = Task({ name: "DataProcessor" }).Async(
  async () => {
    throw new Error("Processing failed")
  },
  (error) => {
    // This handler is always called, even for TaggedThrowable errors
    console.error(`Error processing data: ${error}`)
    return "Failed to process data"
  },
)
```

For regular errors, the handler's return value is used as the rejection value. For errors that are already TaggedThrowable (from inner tasks), the handler is still called for side effects (like logging), but the original error chain is preserved to maintain proper error context.

This ensures that error handlers can perform important operations like logging while preserving the error context needed for debugging nested task operations.

## See Also

- [Task Module Examples](./examples/task-named-errors.ts)
- [Task API Documentation](./quick-reference.md#task)
