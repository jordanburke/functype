# Http Response Validation Design

## Context

`Http.get<User>("/api/users")` currently casts parsed JSON as `T` with zero runtime validation. The generic parameter is a lie — any shape mismatch is a silent runtime bug. We need validation that the type system enforces, not just encourages.

## Design

**Core change:** Without a `validate` function, Http methods return `HttpResponse<unknown>`. With a validator, `T` is inferred from the validator's return type. There is no generic type parameter on Http methods.

```typescript
// Without validator — data is unknown
Http.get("/api/users")
// IO<never, HttpError, HttpResponse<unknown>>

// With validator — T inferred from return type
Http.get("/api/users", {
  validate: (data) => z.array(UserSchema).parse(data),
})
// IO<never, HttpError, HttpResponse<User[]>>
```

**Validator signature:** `(data: unknown) => T` — receives raw parsed data, returns validated typed result. If it throws, the error is caught and wrapped as `DecodeError`.

**Works with any validation library:**

- Zod: `validate: (data) => UserSchema.parse(data)`
- TypeBox: `validate: (data) => Value.Decode(UserSchema, data)`
- Manual: `validate: (data) => { if (!isUser(data)) throw new Error("bad"); return data }`

## Error Flow

Validation failure reuses `DecodeError` (no new variant):

```typescript
{
  _tag: "DecodeError",
  url: "https://api.test/users",
  method: "GET",
  body: '{"id": "not-a-number"}',  // raw response text
  cause: ZodError                   // whatever the validator threw
}
```

Caught with `catchTag("DecodeError", ...)` same as JSON parse failures.

## API Changes

### HttpMethodOptions

```typescript
// Before
interface HttpMethodOptions {
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
}

// After — add validate field
interface HttpMethodOptions<T = unknown> {
  readonly headers?: Record<string, string>
  readonly body?: unknown
  readonly signal?: AbortSignal
  readonly parseAs?: ParseMode
  readonly validate?: (data: unknown) => T
}
```

### Http method signatures

```typescript
// Before — generic T with no enforcement
get<T>(url: string, options?: HttpMethodOptions): IO<never, HttpError, HttpResponse<T>>

// After — T inferred from validate, defaults to unknown
get<T = unknown>(url: string, options?: HttpMethodOptions<T>): IO<never, HttpError, HttpResponse<T>>
```

When `validate` is omitted, `T` defaults to `unknown`. When provided, `T` is inferred from the validator's return type.

### Http.client()

Same pattern — client methods return `HttpResponse<unknown>` without validator:

```typescript
const http = Http.client({ baseUrl: "https://api.test" })
http.get("/users") // HttpResponse<unknown>
http.get("/users", { validate: (d) => UserSchema.parse(d) }) // HttpResponse<User[]>
```

## Files to Change

- `src/fetch/HttpRequest.ts` — add `validate` to options interfaces (make generic)
- `src/fetch/Http.ts` — update `parseResponse` to call validator, update method signatures
- `test/fetch/http.spec.ts` — add validation tests, update existing tests for `unknown` return type

## Verification

1. `Http.get("/url")` returns `IO<never, HttpError, HttpResponse<unknown>>`
2. `Http.get("/url", { validate: fn })` returns `IO<never, HttpError, HttpResponse<T>>` where T is inferred
3. Validator that throws → `DecodeError` with cause = thrown error
4. Existing tests updated for `unknown` data access patterns
5. `pnpm validate` passes
