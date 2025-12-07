# IO Module Additions Specification

## Background

To better support libraries like `supabase-typed-query` that wrap APIs returning `{ data, error }` response objects, we need to add several convenience methods to the IO module.

## New Methods

### 1. `IO.fromResult` (IOCompanion method)

Handle the common `{ data, error }` response pattern used by Supabase, many REST APIs, and similar libraries.

```typescript
/**
 * Creates an IO from a result object with data/error pattern.
 * If error is present (truthy), fails with the error.
 * Otherwise succeeds with the data value.
 *
 * @example
 * ```typescript
 * const response = { data: user, error: null }
 * const io = IO.fromResult(response) // IO<never, null, User>
 *
 * const errorResponse = { data: null, error: new Error("Not found") }
 * const failedIo = IO.fromResult(errorResponse) // IO<never, Error, null>
 * ```
 */
fromResult: <D extends Type, E extends Type>(
  result: { data: D | null; error: E | null }
): IO<never, E, D> =>
  result.error
    ? IO.fail(result.error)
    : IO.succeed(result.data as D)
```

### 2. `IO.tryAsync` (IOCompanion method)

Simpler alternative to `tryPromise` that takes a direct error mapper function instead of an options object.

```typescript
/**
 * Creates an IO from an async thunk with typed error handling.
 * Catches any thrown errors and maps them using the provided function.
 *
 * @param f - Async function to execute
 * @param onError - Function to map caught errors to typed error E
 *
 * @example
 * ```typescript
 * const io = IO.tryAsync(
 *   () => fetch('/api/users').then(r => r.json()),
 *   (e) => new ApiError(e)
 * )
 * ```
 */
tryAsync: <A extends Type, E extends Type>(
  f: () => Promise<A>,
  onError: (error: unknown) => E
): IO<never, E, A> =>
  IO.async(f).mapError(onError)
```

### 3. `IO.asyncResult` (IOCompanion method)

Combined async + result handling for the most common pattern: calling an async API that returns `{ data, error }`.

```typescript
/**
 * Creates an IO from an async function that returns { data, error }.
 * Handles both:
 * - Thrown errors (mapped via onThrow)
 * - Returned errors in the result object
 *
 * This is the most ergonomic way to wrap Supabase and similar API calls.
 *
 * @param f - Async function returning { data, error } object
 * @param onThrow - Function to map thrown errors to typed error E
 *
 * @example
 * ```typescript
 * // Supabase query in one line:
 * const getUser = (id: string): IO<never, Error, User> =>
 *   IO.asyncResult(
 *     () => supabase.from('users').select('*').eq('id', id).single(),
 *     toError
 *   )
 * ```
 */
asyncResult: <D extends Type, E extends Type>(
  f: () => Promise<{ data: D | null; error: E | null }>,
  onThrow: (error: unknown) => E
): IO<never, E, D> =>
  IO.tryAsync(f, onThrow).flatMap(result => IO.fromResult(result))
```

### 4. `.tapError()` (IO instance method)

Execute a side effect when an error occurs without changing the error. Useful for logging.

```typescript
/**
 * Executes a side effect on the error without changing it.
 * Useful for logging errors while preserving the error chain.
 *
 * @param f - Side effect function to run on error
 * @returns Same IO with the side effect attached
 *
 * @example
 * ```typescript
 * const io = IO.asyncResult(() => query(), toError)
 *   .tapError(err => console.error('Query failed:', err))
 *   .map(data => transform(data))
 * ```
 */
tapError(f: (e: E) => void): IO<R, E, A>
```

**Implementation:**

```typescript
// In createIO function, add to the io object:
tapError(f: (e: E) => void): IO<R, E, A> {
  return io.mapError(e => {
    f(e)
    return e
  })
}
```

## Usage Example: Supabase Query

Before (with FPromise/TaskOutcome):
```typescript
one: (): FPromise<TaskOutcome<Option<User>>> => {
  return wrapAsync(async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').single()
      if (error) {
        log.error(`Query failed: ${error}`)
        return Err(toError(error))
      }
      return Ok(Option(data))
    } catch (error) {
      log.error(`Query failed: ${error}`)
      return Err(toError(error))
    }
  })
}
```

After (with new IO methods):
```typescript
one: (): Task<Error, Option<User>> =>
  IO.asyncResult(
    () => supabase.from('users').select('*').single(),
    toError
  )
  .tapError(err => log.error(`Query failed: ${err}`))
  .map(data => Option(data))
```

## File to Modify

`src/io/IO.ts`

## Checklist

- [ ] Add `fromResult` to IOCompanion
- [ ] Add `tryAsync` to IOCompanion
- [ ] Add `asyncResult` to IOCompanion
- [ ] Add `tapError` to IO interface and implementation
- [ ] Add tests for each new method
- [ ] Update io module exports if needed
