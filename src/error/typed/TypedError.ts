import { Throwable } from "@/core/throwable/Throwable"

/**
 * Type-safe error codes using template literal types
 */
export type ErrorCode =
  | "VALIDATION_FAILED"
  | "NETWORK_ERROR"
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "PERMISSION_DENIED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "TIMEOUT"

/**
 * Template literal type for error messages based on error code
 */
export type ErrorMessage<T extends ErrorCode> = T extends "VALIDATION_FAILED"
  ? `Validation failed: ${string}`
  : T extends "NETWORK_ERROR"
    ? `Network error: ${string}`
    : T extends "AUTH_REQUIRED"
      ? `Authentication required: ${string}`
      : T extends "NOT_FOUND"
        ? `Not found: ${string}`
        : T extends "PERMISSION_DENIED"
          ? `Permission denied: ${string}`
          : T extends "RATE_LIMITED"
            ? `Rate limit exceeded: ${string}`
            : T extends "INTERNAL_ERROR"
              ? `Internal server error: ${string}`
              : T extends "BAD_REQUEST"
                ? `Bad request: ${string}`
                : T extends "CONFLICT"
                  ? `Conflict: ${string}`
                  : T extends "TIMEOUT"
                    ? `Request timeout: ${string}`
                    : never

/**
 * HTTP status codes mapped to error codes
 */
export type ErrorStatus<T extends ErrorCode> = T extends "VALIDATION_FAILED" | "BAD_REQUEST"
  ? 400
  : T extends "AUTH_REQUIRED"
    ? 401
    : T extends "PERMISSION_DENIED"
      ? 403
      : T extends "NOT_FOUND"
        ? 404
        : T extends "CONFLICT"
          ? 409
          : T extends "RATE_LIMITED"
            ? 429
            : T extends "TIMEOUT"
              ? 408
              : T extends "INTERNAL_ERROR"
                ? 500
                : T extends "NETWORK_ERROR"
                  ? 503
                  : 500

/**
 * Context type for each error code
 */
export type TypedErrorContext<T extends ErrorCode> = T extends "VALIDATION_FAILED"
  ? { field: string; value: unknown; rule: string }
  : T extends "NETWORK_ERROR"
    ? { url: string; method: string; statusCode?: number }
    : T extends "AUTH_REQUIRED"
      ? { resource: string; requiredRole?: string }
      : T extends "NOT_FOUND"
        ? { resource: string; id: string | number }
        : T extends "PERMISSION_DENIED"
          ? { action: string; resource: string; userId?: string }
          : T extends "RATE_LIMITED"
            ? { limit: number; window: string; retryAfter?: number }
            : T extends "INTERNAL_ERROR"
              ? { errorId: string; timestamp: string }
              : T extends "BAD_REQUEST"
                ? { reason: string; expected?: string }
                : T extends "CONFLICT"
                  ? { resource: string; conflictingValue: string }
                  : T extends "TIMEOUT"
                    ? { duration: number; operation: string }
                    : Record<string, unknown>

/**
 * Type-safe error class with template literal types
 */
export interface TypedError<T extends ErrorCode> extends Throwable {
  readonly code: T
  readonly message: ErrorMessage<T>
  readonly status: ErrorStatus<T>
  readonly context: TypedErrorContext<T>
  readonly timestamp: string
  readonly traceId?: string
}

/**
 * Create a typed error with compile-time type safety
 */
const TypedErrorConstructor = <T extends ErrorCode>(
  code: T,
  message: ErrorMessage<T>,
  context: TypedErrorContext<T>,
  options?: {
    cause?: unknown
    traceId?: string
  },
): TypedError<T> => {
  const error = Throwable.apply(message, context, { name: code, description: message }) as TypedError<T>

  return Object.assign(error, {
    code,
    message,
    status: getStatusForCode(code),
    context,
    timestamp: new Date().toISOString(),
    traceId: options?.traceId,
  })
}

/**
 * Get HTTP status for error code
 */
const getStatusForCode = <T extends ErrorCode>(code: T): ErrorStatus<T> => {
  const statusMap: Record<ErrorCode, number> = {
    VALIDATION_FAILED: 400,
    BAD_REQUEST: 400,
    AUTH_REQUIRED: 401,
    PERMISSION_DENIED: 403,
    NOT_FOUND: 404,
    TIMEOUT: 408,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
    NETWORK_ERROR: 503,
  }
  return statusMap[code] as ErrorStatus<T>
}

/**
 * Type-safe error builders for each error type
 */
const TypedErrorCompanion = {
  /**
   * Create a validation error
   * @example
   * const error = TypedError.validation("email", "test@", "must be valid email")
   * // Type: TypedError<"VALIDATION_FAILED">
   * // Message must match: "Validation failed: ..."
   */
  validation: (field: string, value: unknown, rule: string): TypedError<"VALIDATION_FAILED"> =>
    TypedErrorConstructor("VALIDATION_FAILED", `Validation failed: ${field} ${rule}`, { field, value, rule }),

  /**
   * Create a network error
   * @example
   * const error = TypedError.network("https://api.example.com", "POST", 500)
   * // Type: TypedError<"NETWORK_ERROR">
   */
  network: (url: string, method: string, statusCode?: number): TypedError<"NETWORK_ERROR"> =>
    TypedErrorConstructor("NETWORK_ERROR", `Network error: ${method} ${url}${statusCode ? ` (${statusCode})` : ""}`, {
      url,
      method,
      statusCode,
    }),

  /**
   * Create an authentication error
   * @example
   * const error = TypedError.auth("/api/admin", "admin")
   * // Type: TypedError<"AUTH_REQUIRED">
   */
  auth: (resource: string, requiredRole?: string): TypedError<"AUTH_REQUIRED"> =>
    TypedErrorConstructor(
      "AUTH_REQUIRED",
      `Authentication required: ${resource}${requiredRole ? ` (role: ${requiredRole})` : ""}`,
      { resource, requiredRole },
    ),

  /**
   * Create a not found error
   * @example
   * const error = TypedError.notFound("user", "123")
   * // Type: TypedError<"NOT_FOUND">
   */
  notFound: (resource: string, id: string | number): TypedError<"NOT_FOUND"> =>
    TypedErrorConstructor("NOT_FOUND", `Not found: ${resource} with id ${id}`, { resource, id }),

  /**
   * Create a permission denied error
   * @example
   * const error = TypedError.permission("delete", "post", "user123")
   * // Type: TypedError<"PERMISSION_DENIED">
   */
  permission: (action: string, resource: string, userId?: string): TypedError<"PERMISSION_DENIED"> =>
    TypedErrorConstructor("PERMISSION_DENIED", `Permission denied: cannot ${action} ${resource}`, {
      action,
      resource,
      userId,
    }),

  /**
   * Create a rate limit error
   * @example
   * const error = TypedError.rateLimit(100, "1h", 3600)
   * // Type: TypedError<"RATE_LIMITED">
   */
  rateLimit: (limit: number, window: string, retryAfter?: number): TypedError<"RATE_LIMITED"> =>
    TypedErrorConstructor("RATE_LIMITED", `Rate limit exceeded: ${limit} requests per ${window}`, {
      limit,
      window,
      retryAfter,
    }),

  /**
   * Create an internal error
   * @example
   * const error = TypedError.internal("ERR-500-ABC123")
   * // Type: TypedError<"INTERNAL_ERROR">
   */
  internal: (errorId: string): TypedError<"INTERNAL_ERROR"> =>
    TypedErrorConstructor("INTERNAL_ERROR", `Internal server error: ${errorId}`, {
      errorId,
      timestamp: new Date().toISOString(),
    }),

  /**
   * Create a bad request error
   * @example
   * const error = TypedError.badRequest("Invalid JSON", "valid JSON object")
   * // Type: TypedError<"BAD_REQUEST">
   */
  badRequest: (reason: string, expected?: string): TypedError<"BAD_REQUEST"> =>
    TypedErrorConstructor("BAD_REQUEST", `Bad request: ${reason}`, { reason, expected }),

  /**
   * Create a conflict error
   * @example
   * const error = TypedError.conflict("email", "user@example.com")
   * // Type: TypedError<"CONFLICT">
   */
  conflict: (resource: string, conflictingValue: string): TypedError<"CONFLICT"> =>
    TypedErrorConstructor("CONFLICT", `Conflict: ${resource} already exists with value ${conflictingValue}`, {
      resource,
      conflictingValue,
    }),

  /**
   * Create a timeout error
   * @example
   * const error = TypedError.timeout(30000, "database query")
   * // Type: TypedError<"TIMEOUT">
   */
  timeout: (duration: number, operation: string): TypedError<"TIMEOUT"> =>
    TypedErrorConstructor("TIMEOUT", `Request timeout: ${operation} exceeded ${duration}ms`, { duration, operation }),

  /**
   * Check if a value is a TypedError
   */
  isTypedError: (value: unknown): value is TypedError<ErrorCode> => {
    return (
      typeof value === "object" &&
      value !== null &&
      "code" in value &&
      "message" in value &&
      "status" in value &&
      "context" in value &&
      "_tag" in value &&
      (value as any)._tag === "Throwable"
    )
  },

  /**
   * Check if a TypedError has a specific code
   */
  hasCode: <T extends ErrorCode>(error: TypedError<ErrorCode>, code: T): error is TypedError<T> => {
    return error.code === code
  },
}

export const TypedError = Object.assign(TypedErrorConstructor, TypedErrorCompanion)
