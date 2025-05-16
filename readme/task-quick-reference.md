# Task Quick Reference

## Basic Usage

```typescript
import { Task } from "@/core"

// Synchronous task with explicit error handling
const syncResult = Task().Sync(
  () => "success", // Main operation
  (error) => error, // Error handler (optional)
  () => {}, // Finally (optional)
)

// syncResult is Either<Throwable, string>
if (syncResult.isRight()) {
  console.log("Success:", syncResult.value) // "success"
} else {
  console.log("Error:", syncResult.value) // Throwable
}

// Asynchronous task (Promise-based)
const asyncResult = await Task().Async(
  async () => "async success", // Main operation (async)
  async (error) => error, // Error handler (optional, async)
  async () => {}, // Finally (optional, async)
)

// asyncResult is the unwrapped value: "async success"
// If error occurs, the promise rejects with Throwable
```

## Task Naming and Error Context

```typescript
// Named task provides context for errors
const userTask = Task({
  name: "UserService",
  description: "Handles user operations",
})

// Error will include task name and description
try {
  await userTask.Async(async () => {
    throw new Error("Not found")
  })
} catch (error) {
  console.log(error.name) // "UserService"
  console.log(error.message) // "Not found"
  console.log(error.taskInfo) // { name: "UserService", description: "..." }
}
```

## Companion Functions

```typescript
// Create success/failure results
const success = Task.success("data", { name: "SuccessTask" })
const failure = Task.fail(new Error("Failed"), { context: true }, { name: "FailTask" })

// Convert promise function to task
const fetchTask = Task.fromPromise(fetch, { name: "FetchTask" })
const response = await fetchTask("https://api.example.com/data")

// Convert task result to promise
const promise = Task.toPromise(success) // Promise<string>

// Convert Node.js callback to task
const readFileTask = Task.fromNodeCallback(fs.readFile)
const content = await readFileTask("config.json", "utf8")
```

## Cancellation

```typescript
// Create cancellable task
const { task, cancel } = Task.cancellable(async (token) => {
  // Check cancellation
  if (token.isCancelled) return "Already cancelled"

  // Use with fetch
  const response = await fetch(url, { signal: token.signal })

  // Register cleanup on cancellation
  token.onCancel(() => {
    console.log("Task cancelled")
  })

  return await response.json()
})

// Later: cancel the task
cancel()
```

## Progress Tracking

```typescript
// Create task with progress updates
const { task, currentProgress, cancel } = Task.withProgress(
  async (updateProgress, token) => {
    updateProgress(0) // Initial progress

    // Do work in chunks
    for (let i = 0; i < 10; i++) {
      if (token.isCancelled) break
      await processChunk(i)
      updateProgress((i + 1) * 10) // Update progress (0-100)
    }

    return "Complete"
  },
  (percent) => {
    console.log(`Progress: ${percent}%`)
  },
)

// Get current progress anytime
console.log(`Status: ${currentProgress()}%`)
```

## Task Racing

```typescript
// Race multiple tasks
const result = await Task.race(
  [task1, task2, task3], // Array of tasks to race
  5000, // Optional timeout in milliseconds
  { name: "RaceTask" }, // Optional task params
)

// Result is from the first task to complete
// Throws if all tasks fail or timeout is reached
```

## Task Composition

```typescript
// Sequential composition
const result = await Task().Async(async () => {
  const first = await Task().Async(async () => "first")
  const second = await Task().Async(async () => first + " second")
  return second // "first second"
})

// Error handling composition
try {
  await Task({ name: "Outer" }).Async(async () => {
    await Task({ name: "Inner" }).Async(async () => {
      throw new Error("Inner error")
    })
  })
} catch (error) {
  // Error message is from inner task: "Inner error"
  // But task context is from outer task: { name: "Outer" }
}
```
