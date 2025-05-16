# Task Cancellation and Progress Tracking

The Task module in functype now provides robust support for cancellation and progress tracking of asynchronous operations. This guide explains how to use these advanced features.

## Cancellation

Task cancellation allows you to safely stop long-running operations that are no longer needed, improving resource usage and user experience.

### Creating Cancellable Tasks

```typescript
import { Task } from "@/core"

// Create a cancellable task
const { task, cancel } = Task.cancellable(async (token) => {
  // The token is passed to your task function

  // Use token.isCancelled to check cancellation status
  if (token.isCancelled) {
    return "Cancelled before starting work"
  }

  // Perform your long-running operation, checking cancellation periodically
  for (const item of largeDataset) {
    if (token.isCancelled) {
      return "Cancelled during processing"
    }

    await processItem(item)
  }

  return "Completed successfully"
})

// Execute task
task.then((result) => console.log(result)).catch((error) => console.error(error))

// Later, if needed, cancel the operation
cancel()
```

### Cancellation Token Features

The `CancellationToken` provides three key properties:

1. **isCancelled**: Boolean flag indicating cancellation status
2. **signal**: An `AbortSignal` compatible with fetch and other DOM APIs
3. **onCancel**: Method to register callbacks that execute on cancellation

### Integration with Web APIs

The cancellation token's `signal` property works with any API that accepts AbortSignal:

```typescript
const { task, cancel } = Task.cancellable(async (token) => {
  // Pass the signal to fetch
  const response = await fetch("https://api.example.com/data", {
    signal: token.signal,
  })

  // Process response...
  return await response.json()
})

// Cancel after 5 seconds if still running
setTimeout(cancel, 5000)
```

### Custom Cancellation Handlers

Register cleanup code that runs when cancellation occurs:

```typescript
const { task, cancel } = Task.cancellable(async (token) => {
  // Setup resources
  const resources = await allocateExpensiveResources()

  // Register cleanup on cancellation
  token.onCancel(() => {
    resources.dispose()
    console.log("Resources cleaned up")
  })

  try {
    // Do work with resources...
    return result
  } finally {
    // This still runs even with cancellation
    resources.dispose()
  }
})
```

## Progress Tracking

For long-running operations, reporting progress provides better feedback to users.

### Basic Progress Tracking

```typescript
// Create a task with progress tracking
const { task, currentProgress } = Task.withProgress(
  async (updateProgress) => {
    // Start at 0%
    updateProgress(0)

    // Process in chunks
    for (let i = 0; i < 10; i++) {
      // Do some work...
      await processChunk(i)

      // Update progress (0-100)
      updateProgress((i + 1) * 10)
    }

    return "Completed successfully"
  },
  // Optional callback receives progress updates
  (percent) => {
    console.log(`Progress: ${percent}%`)
    updateProgressBar(percent)
  },
)

// Execute the task
const result = await task

// Get current progress anytime
console.log(`Current progress: ${currentProgress()}%`)
```

### Combining Progress with Cancellation

Both features can be used together for maximum control:

```typescript
const { task, cancel, currentProgress } = Task.withProgress(async (updateProgress, token) => {
  updateProgress(0)

  for (let i = 0; i < 100; i++) {
    // Check cancellation
    if (token.isCancelled) {
      return "Operation cancelled"
    }

    await processItem(i)
    updateProgress(i + 1)
  }

  return "All items processed"
})

// Show progress in UI
const interval = setInterval(() => {
  updateUI(`Progress: ${currentProgress()}%`)

  // Once complete, clear the interval
  if (currentProgress() === 100) {
    clearInterval(interval)
  }
}, 100)

// Allow cancellation from UI
cancelButton.addEventListener("click", () => {
  cancel()
})
```

### AsyncWithProgress Method

For direct method usage without the object destructuring pattern:

```typescript
const task = Task().AsyncWithProgress(
  (updateProgress) => {
    // Update progress as needed
    updateProgress(25)

    // Return result
    return "done"
  },
  (percent) => console.log(`Progress: ${percent}%`),
  (error) => error, // Optional error handler
  () => {}, // Optional finally function
  token, // Optional cancellation token
)
```

## Racing Tasks

When multiple asynchronous operations are running in parallel, you might want to take the first to complete:

```typescript
// Create multiple tasks
const task1 = Task().Async(async () => /* slow operation */)
const task2 = Task().Async(async () => /* medium operation */)
const task3 = Task().Async(async () => /* fast operation */)

// Race the tasks with a 5 second timeout
const result = await Task.race(
  [task1, task2, task3],
  5000, // Optional timeout in ms
  { name: "DataRace" } // Optional task params
)

// Result will be from the first task to complete
// Or will throw an error if all tasks fail or the timeout is reached
```

## Node.js Callback Integration

Convert traditional Node.js callback functions to Task:

```typescript
import { readFile } from "fs"
import { Task } from "@/core"

// Convert Node.js callback function to Task
const readFileTask = Task.fromNodeCallback<string, [string, string]>(readFile)

// Use the task
try {
  const content = await readFileTask("config.json", "utf8")
  console.log(content)
} catch (error) {
  console.error("Error reading file:", error)
}
```

## Best Practices

1. **Check Cancellation Regularly**: Check the token status at appropriate intervals in long-running tasks
2. **Clean Up Resources**: Use `onCancel` or `finally` blocks to ensure resources are released
3. **Progress Granularity**: Don't update progress too frequently to avoid performance overhead
4. **Timeout Handling**: Use timeouts with `Task.race` to prevent indefinitely waiting for operations
5. **Error Propagation**: Remember that cancellation generates error objects with task context

## Cancellation vs. Errors

A cancelled task will reject with a cancellation error. If you need to distinguish between regular errors and cancellation:

```typescript
try {
  await task
} catch (error) {
  if (error.message.includes("cancelled")) {
    // Handle cancellation
  } else {
    // Handle regular error
  }
}
```

## See Also

- [Task Error Handling](./task-error-handling.md)
- [Task Implementation Details](./TASK-IMPLEMENTATION.md)
- [Task Migration Guide](./TaskMigration.md)
