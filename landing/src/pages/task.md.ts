export async function GET() {
  const markdown = `# Task

Handle synchronous and asynchronous operations with structured error handling.

## Overview

Task v2 provides a unified way to handle both sync and async operations with the **Ok/Err pattern**, returning \`TaskOutcome<T>\` for all operations. It offers better error handling than raw Promises and integrates seamlessly with functype's other types.

## Key Features

- **Unified Error Handling**: All operations return TaskOutcome<T> (Ok or Err)
- **Explicit Success/Failure**: Use Ok() and Err() for precise control
- **Auto-wrapping**: Raw values become Ok, thrown errors become Err
- **Error Recovery**: Error handlers can return Ok to recover
- **Type Safety**: Fully typed with TypeScript generics
- **Cancellation**: Support for cancellable async operations

## Creating Tasks

\`\`\`typescript
import { Task, Ok, Err, type TaskOutcome } from "functype"

// Synchronous task
const syncTask = Task().Sync(() => "success")
// Returns: TaskSuccess<string>

// Asynchronous task
const asyncTask = await Task().Async(async () => {
  const data = await fetchData()
  return data
})
// Returns: TaskOutcome<Data>

// With explicit Ok/Err
const explicitTask = await Task().Async(async (): Promise<TaskOutcome<string>> => {
  if (Math.random() > 0.5) {
    return Ok("success")
  }
  return Err<string>("failed")
})
\`\`\`

## Auto-wrapping Behavior

\`\`\`typescript
// Raw values are auto-wrapped as Ok
const task1 = await Task().Async(async () => {
  return "raw value"  // Auto-wrapped as Ok("raw value")
})

// Thrown errors are auto-wrapped as Err
const task2 = await Task().Async(async () => {
  throw new Error("failed")  // Auto-wrapped as Err(error)
})

// Explicit Ok/Err bypass auto-wrapping
const task3 = await Task().Async(async () => {
  return Ok("explicit success")  // Used as-is
})
\`\`\`

## Error Handling

\`\`\`typescript
// With error handler
const result = await Task().Async(
  async () => {
    throw new Error("initial error")
  },
  async (error) => {
    console.error("Error occurred:", error)
    return Err(error)  // Propagate error
  }
)

// Error recovery
const recovered = await Task().Async(
  async () => {
    throw new Error("failed")
  },
  async (error) => {
    console.log("Recovering from error")
    return Ok("recovered value")  // Recover!
  }
)
\`\`\`

## Working with Results

\`\`\`typescript
const result = await Task().Async(async () => "success")

// Check success/failure
if (result.isSuccess()) {
  console.log(result.value)      // Access success value
} else {
  console.error(result.error)    // Access error (Throwable)
}

// Pattern matching
const message = result.fold(
  error => \`Failed: \${error.message}\`,
  value => \`Success: \${value}\`
)
\`\`\`

## Chaining Tasks

\`\`\`typescript
const chainedResult = await Task().Async(async () => {
  // First task
  const firstResult = await Task().Async(async () => "first")
  if (firstResult.isFailure()) {
    return firstResult  // Propagate failure
  }

  // Second task
  const secondResult = await Task().Async(async () => "second")
  if (secondResult.isFailure()) {
    return secondResult
  }

  // Combine results
  return Ok(\`\${firstResult.value} + \${secondResult.value}\`)
})
\`\`\`

## Converting Promise Functions

\`\`\`typescript
// Original promise-based function
const fetchUserAPI = (userId: string): Promise<User> =>
  fetch(\`/api/users/\${userId}\`).then(r => r.json())

// Convert to Task-based function
const fetchUser = Task.fromPromise(fetchUserAPI)
// Returns: (userId: string) => FPromise<TaskOutcome<User>>

// Use it
const userResult = await fetchUser("user123")
if (userResult.isSuccess()) {
  console.log(userResult.value)  // User object
}
\`\`\`

## Promise Interop

\`\`\`typescript
const result = await Task().Async(async () => "success")

// Convert TaskOutcome back to Promise
const promise = Task.toPromise(result)
// Success → resolves with value
// Failure → rejects with error

// Use with Promise chains
promise
  .then(value => console.log("Value:", value))
  .catch(error => console.error("Error:", error))
\`\`\`

## Task Configuration

\`\`\`typescript
// With name (for better error messages)
const namedTask = Task({ name: "FetchUser" }).Async(async () => {
  return await fetchUser()
})

// With timeout
const timedTask = Task({ timeout: 5000 }).Async(async () => {
  return await slowOperation()
})
// Throws if operation takes > 5 seconds
\`\`\`

## Common Patterns

### Safe API calls

\`\`\`typescript
async function fetchUser(id: string): Promise<TaskOutcome<User>> {
  return Task().Async(async () => {
    const response = await fetch(\`/api/users/\${id}\`)
    if (!response.ok) {
      return Err<User>(\`HTTP \${response.status}\`)
    }
    const user = await response.json()
    return Ok(user)
  })
}

const result = await fetchUser("123")
const userName = result.isSuccess()
  ? result.value.name
  : "Unknown"
\`\`\`

### Retry logic

\`\`\`typescript
async function withRetry<T>(
  operation: () => Promise<TaskOutcome<T>>,
  maxRetries: number
): Promise<TaskOutcome<T>> {
  let lastError: TaskOutcome<T> | null = null

  for (let i = 0; i < maxRetries; i++) {
    const result = await operation()
    if (result.isSuccess()) {
      return result
    }
    lastError = result
    await delay(1000 * Math.pow(2, i))  // Exponential backoff
  }

  return lastError!
}
\`\`\`

### Parallel tasks

\`\`\`typescript
const [user, posts, comments] = await Promise.all([
  Task().Async(async () => fetchUser(userId)),
  Task().Async(async () => fetchPosts(userId)),
  Task().Async(async () => fetchComments(userId))
])

if (user.isSuccess() && posts.isSuccess() && comments.isSuccess()) {
  console.log({
    user: user.value,
    posts: posts.value,
    comments: comments.value
  })
}
\`\`\`

### Sequential with early exit

\`\`\`typescript
async function processData(id: string): Promise<TaskOutcome<Result>> {
  return Task().Async(async () => {
    const userData = await fetchUser(id)
    if (userData.isFailure()) {
      return userData  // Early exit
    }

    const enriched = await enrichData(userData.value)
    if (enriched.isFailure()) {
      return enriched  // Early exit
    }

    const saved = await saveToDatabase(enriched.value)
    return saved
  })
}
\`\`\`

## Error Formatting

Task integrates with functype's error formatting for better debugging:

\`\`\`typescript
import { formatError } from "functype/error"

const task = Task({ name: "DbQuery" }).Sync(() => {
  throw new Error("Connection failed")
})

if (task.isFailure()) {
  console.error(formatError(task.error, {
    includeTasks: true,
    includeStackTrace: true,
    colors: true
  }))
}
\`\`\`

## When to Use Task

### ✓ Use Task for:

- Async operations with structured error handling
- Converting promise-based APIs to functype patterns
- Operations that need timeout support
- Building robust error handling pipelines

### ✗ Avoid Task for:

- Simple synchronous operations (use Try instead)
- Operations where you need to accumulate errors (use Either)
- Fire-and-forget operations (use raw Promises)

## Comparison to Alternatives

### Task vs Promise

\`\`\`typescript
// Promise: Throws on error
const promise = fetchData()
  .then(data => process(data))
  .catch(err => console.error(err))

// Task: Structured result
const task = await Task().Async(async () => {
  const data = await fetchData()
  return process(data)
})
if (task.isSuccess()) {
  console.log(task.value)
} else {
  console.error(task.error)
}
\`\`\`

### Task vs Try

\`\`\`typescript
// Try: For sync operations
const tryResult = Try(() => JSON.parse(input))

// Task: For async operations
const taskResult = await Task().Async(async () => {
  return JSON.parse(input)
})
\`\`\`

## API Reference

For complete API documentation, see the [Task API docs](https://functype.org/api-docs/modules/Task.html).

## Learn More

- [Try Documentation](https://functype.org/try)
- [Either Documentation](https://functype.org/either)
- [Error Formatting Guide](https://github.com/jordanburke/functype/blob/main/docs/error-formatting.md)
- [Feature Matrix](https://functype.org/feature-matrix)
`

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}
