# Error Formatting and Logging

This guide explains how to effectively format and log errors in functype, focusing on improving error display for better debugging and troubleshooting.

## The Challenge of Error Display

JavaScript errors can be challenging to understand, especially in complex functional applications. functype's `Throwable` and error modules provide robust error handling capabilities, but default error output in logs and consoles doesn't always provide a clear picture of what went wrong.

## Built-in Error Utilities

functype provides several built-in utilities for working with errors:

### Throwable

The `Throwable` class wraps any error or value into a standardized Error object:

```typescript
import { Throwable } from "@/core"

// Wrap any value as an error
const error = Throwable.apply("Connection failed")
console.error(error) // Error: Connection failed

// Add structured data to the error
const errorWithData = Throwable.apply(new Error("Query failed"), {
  query: "SELECT * FROM users",
  parameters: { id: 123 },
})
console.error(errorWithData)
```

### Error Chains

`getErrorChain` and `formatErrorChain` follow an error's `cause` links, from the outermost error to the innermost. A `Throwable` made with a step name shows it in brackets:

```typescript
import { formatErrorChain, getErrorChain, Throwable } from "functype"

const dbError = Throwable.apply(new Error("Connection timeout"), undefined, { name: "DbQuery", description: "" })
const error = Throwable.apply(new Error("Failed to load user", { cause: dbError }), undefined, {
  name: "UserService",
  description: "",
})

// Extract the full error chain
const errorChain = getErrorChain(error) // [error, dbError]

// Format it as a string
console.error(formatErrorChain(error, { includeTasks: true }))
// Output:
// [UserService] Failed to load user
// ↳ [DbQuery] Connection timeout
```

## Enhanced Error Formatting

functype provides more advanced error formatting utilities in the `error` module:

```typescript
import { formatError, createErrorSerializer } from "@/error"
```

### Console Formatting

The `formatError` function creates a well-structured, human-readable representation of errors:

```typescript
const error =
  /* some complex error */
  console.error(
    formatError(error, {
      includeTasks: true, // Include task names
      includeStackTrace: true, // Include stack traces
      includeData: true, // Include error data
      maxStackFrames: 3, // Limit stack frames
      title: "API Error", // Custom title
      colors: true, // Use ANSI colors (for terminal)
    }),
  )
```

This produces output like:

```
API Error: User registration failed

[UserController] UserController: UserService: DatabaseQuery: Database connection failed
  at registerUser (/app/src/controllers/user.ts:25:7)
  at processRequest (/app/src/server.ts:42:12)
  ...2 more stack frames
↳ [UserService] UserService: DatabaseQuery: Database connection failed
  at createUser (/app/src/services/user.ts:18:5)
  at executeRequest (/app/src/controllers/user.ts:24:20)
  ...2 more stack frames
↳ [DatabaseQuery] Database connection failed
  at executeQuery (/app/src/db/query.ts:63:11)
  at createUser (/app/src/services/user.ts:17:18)
  ...2 more stack frames

Context:
{
  "connectionId": "conn-123",
  "dbHost": "db.example.com",
  "retryCount": 3
}
```

### Structured Logging with Pino

For structured logging (like Pino), use the error serializer:

```typescript
import pino from "pino"
import { createErrorSerializer } from "@/error"

// Create a Pino logger with the error serializer
const logger = pino({
  serializers: {
    err: createErrorSerializer(),
  },
})

try {
  // Some operation that throws
} catch (error) {
  // Log with all context preserved
  logger.error({ err: error, requestId: "req-123" }, "Operation failed")
}
```

The generated log will include:

- The full error chain, with step names from `taskInfo`
- Structured error data
- All enumerable properties from the error
- Properly formatted stack traces

## Best Practices

### 1. For Development and Console

Use the `formatError` function with colors for readable console output:

```typescript
console.error(
  formatError(error, {
    includeTasks: true,
    includeStackTrace: true,
    includeData: true,
    colors: true,
  }),
)
```

### 2. For Production Logging

Use the error serializer with your logging library:

```typescript
// With Pino
const logger = pino({
  serializers: {
    err: createErrorSerializer(),
  },
})

// Log the error with context
logger.error(
  {
    err: error,
    // Additional context
    requestId: ctx.requestId,
    userId: ctx.userId,
    operation: "user-registration",
  },
  "Operation failed",
)
```

### 3. For API Error Responses

Create user-friendly error responses while preserving debugging info:

```typescript
try {
  // Operation that might throw
} catch (error) {
  // Log the detailed error for debugging
  logger.error({ err: error, requestId: req.id }, "Operation failed")

  // Send a simplified version to the client
  res.status(500).json({
    error: "Operation failed",
    message: error.message,
    requestId: req.id,
    // Don't include stack traces or sensitive data in responses
  })
}
```

## Error Visualization Examples

Different methods of displaying errors:

### Standard console.log (Not Recommended)

```typescript
console.log("Error:", error)
// Output: Error: [object Error] (often not helpful)
```

### Using console.error with Error Object (Basic)

```typescript
console.error(error)
// Output: Error: Connection failed
//    at Object.<anonymous> (/app/src/index.ts:10:13)
//    at Module._compile (internal/modules/cjs/loader.js:1138:30)
//    ...
```

### Using formatError (Recommended)

```typescript
console.error(
  formatError(error, {
    includeTasks: true,
    includeStackTrace: true,
    colors: true,
  }),
)
// Output: (nicely formatted with colors and context)
```

### Using JSON.stringify (Not Recommended)

```typescript
console.log(JSON.stringify(error))
// Output: {} (empty, as errors don't stringify well)
```

### Using Serializer and JSON.stringify (Better)

```typescript
console.log(JSON.stringify(createErrorSerializer()(error), null, 2))
// Output: (properly serialized error with all context)
```

## Conclusion

Effective error formatting and logging significantly improves debugging and troubleshooting. By using functype's error utilities, you can:

1. Preserve full error context, including step names
2. Create human-readable error displays for development
3. Generate structured error logs for production monitoring
4. Maintain a balance between detail and clarity

This approach makes errors more useful and actionable, reducing the time spent debugging and improving the overall quality of error handling in your application.
