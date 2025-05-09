# Task Migration Guide

This guide demonstrates how to migrate traditional Promise-based code to the functional `Task` pattern in the functype library.

## The Problem with Traditional Promises

Traditional JavaScript/TypeScript Promise-based code often suffers from:

1. Implicit error handling (errors silently propagate)
2. Hard-to-trace error stacks
3. Mixed error types without type safety
4. Verbose try/catch blocks
5. Side effects spread throughout the codebase

## Migration Path: Traditional Promises → Task

### Step 1: Identify Promise-Based Code

```typescript
// Traditional promise-based API call
function fetchUserData(userId: string): Promise<UserData> {
  return fetch(`/api/users/${userId}`).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`)
    }
    return response.json()
  })
}

// Usage with promise chains
function displayUserProfile(userId: string): Promise<void> {
  return fetchUserData(userId)
    .then((userData) => {
      renderProfile(userData)
    })
    .catch((error) => {
      showErrorMessage(error)
    })
}
```

### Step 2: Convert to Task with fromPromise adapter

```typescript
import { Task } from "@/core/task/Task"

// Step 1: Create a Task wrapper
const userTask = Task<UserData>({ name: "UserOperations" })

// Step 2: Convert promise function to Task function
const fetchUserData = (userId: string): FPromise<UserData> => {
  return userTask.fromPromise((id: string) =>
    fetch(`/api/users/${id}`).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.statusText}`)
      }
      return response.json()
    }),
  )(userId)
}

// Step 3: Use in Task-based workflow
const displayUserProfile = (userId: string): FPromise<void> => {
  return fetchUserData(userId)
    .then((userData) => {
      renderProfile(userData)
      return undefined
    })
    .catch((error) => {
      showErrorMessage(error)
      return undefined
    })
}
```

### Step 3: Fully Embrace the Functional Pattern

```typescript
import { Task, TaskResult, TaskException } from "@/core/task/Task"
import { Either } from "@/either/Either"
import { Throwable } from "@/core/throwable/Throwable"

// Create a domain-specific Task
const userTask = Task<UserData>({ name: "UserOperations" })

// Fully functional API
const fetchUserData = (userId: string): FPromise<Either<Throwable, UserData>> => {
  return FPromise<Either<Throwable, UserData>>(async (resolve) => {
    try {
      const response = await fetch(`/api/users/${userId}`)
      if (!response.ok) {
        resolve(userTask.fail(new Error(`Failed to fetch user: ${response.statusText}`)))
        return
      }
      const data = await response.json()
      resolve(userTask.success(data))
    } catch (error) {
      resolve(userTask.fail(error))
    }
  })
}

// Functional composition with proper error handling
const displayUserProfile = (userId: string): FPromise<void> => {
  return fetchUserData(userId).then((result) => {
    if (result.isRight()) {
      renderProfile(result.get())
    } else {
      showErrorMessage(result.get())
    }
  })
}
```

## Benefits of Task-Based Approach

1. **Explicit Error Handling**: Errors are represented as values in the Either type
2. **Type Safety**: Error and success paths are fully typed
3. **Composition**: Tasks can be composed with other functional patterns
4. **Interoperability**: Can work with existing Promise-based code
5. **Testability**: Pure functions are easier to test

## Best Practices

1. Use descriptive names for Tasks that reflect their domain purpose
2. Leverage the `fromPromise` adapter for gradual migration
3. Combine with Either for full type safety in error handling
4. Use `toPromise` when integrating back with traditional Promise-based APIs
5. Keep Task operations pure when possible
