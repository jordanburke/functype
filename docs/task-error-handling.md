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

## See Also

- [Task Module Examples](./examples/task-named-errors.ts)
- [Task API Documentation](./quick-reference.md#task)
