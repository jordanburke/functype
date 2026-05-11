import { describe, it, expect } from "vitest"
import {
  TypedError,
  type ErrorCode,
  type ErrorMessage,
  type ErrorStatus,
  type TypedErrorContext,
} from "@/error/typed/TypedError"

describe("TypedError", () => {
  describe("type safety", () => {
    it("should enforce correct message format for validation errors", () => {
      const error = TypedError.validation("email", "invalid@", "must be a valid email")

      expect(error.code).toBe("VALIDATION_FAILED")
      expect(error.message).toBe("Validation failed: email must be a valid email")
      expect(error.status).toBe(400)
      expect(error.context).toEqual({
        field: "email",
        value: "invalid@",
        rule: "must be a valid email",
      })
    })

    it("should enforce correct message format for network errors", () => {
      const error = TypedError.network("https://api.example.com", "POST", 500)

      expect(error.code).toBe("NETWORK_ERROR")
      expect(error.message).toBe("Network error: POST https://api.example.com (500)")
      expect(error.status).toBe(503)
      expect(error.context).toEqual({
        url: "https://api.example.com",
        method: "POST",
        statusCode: 500,
      })
    })

    it("should enforce correct message format for auth errors", () => {
      const error = TypedError.auth("/api/admin", "admin")

      expect(error.code).toBe("AUTH_REQUIRED")
      expect(error.message).toBe("Authentication required: /api/admin (role: admin)")
      expect(error.status).toBe(401)
      expect(error.context).toEqual({
        resource: "/api/admin",
        requiredRole: "admin",
      })
    })

    it("should enforce correct message format for not found errors", () => {
      const error = TypedError.notFound("user", "123")

      expect(error.code).toBe("NOT_FOUND")
      expect(error.message).toBe("Not found: user with id 123")
      expect(error.status).toBe(404)
      expect(error.context).toEqual({
        resource: "user",
        id: "123",
      })
    })

    it("should enforce correct message format for permission errors", () => {
      const error = TypedError.permission("delete", "post", "user123")

      expect(error.code).toBe("PERMISSION_DENIED")
      expect(error.message).toBe("Permission denied: cannot delete post")
      expect(error.status).toBe(403)
      expect(error.context).toEqual({
        action: "delete",
        resource: "post",
        userId: "user123",
      })
    })

    it("should enforce correct message format for rate limit errors", () => {
      const error = TypedError.rateLimit(100, "1h", 3600)

      expect(error.code).toBe("RATE_LIMITED")
      expect(error.message).toBe("Rate limit exceeded: 100 requests per 1h")
      expect(error.status).toBe(429)
      expect(error.context).toEqual({
        limit: 100,
        window: "1h",
        retryAfter: 3600,
      })
    })

    it("should enforce correct message format for internal errors", () => {
      const error = TypedError.internal("ERR-500-ABC123")

      expect(error.code).toBe("INTERNAL_ERROR")
      expect(error.message).toBe("Internal server error: ERR-500-ABC123")
      expect(error.status).toBe(500)
      expect(error.context.errorId).toBe("ERR-500-ABC123")
      expect(error.context.timestamp).toBeDefined()
    })

    it("should enforce correct message format for bad request errors", () => {
      const error = TypedError.badRequest("Invalid JSON", "valid JSON object")

      expect(error.code).toBe("BAD_REQUEST")
      expect(error.message).toBe("Bad request: Invalid JSON")
      expect(error.status).toBe(400)
      expect(error.context).toEqual({
        reason: "Invalid JSON",
        expected: "valid JSON object",
      })
    })

    it("should enforce correct message format for conflict errors", () => {
      const error = TypedError.conflict("email", "user@example.com")

      expect(error.code).toBe("CONFLICT")
      expect(error.message).toBe("Conflict: email already exists with value user@example.com")
      expect(error.status).toBe(409)
      expect(error.context).toEqual({
        resource: "email",
        conflictingValue: "user@example.com",
      })
    })

    it("should enforce correct message format for timeout errors", () => {
      const error = TypedError.timeout(30000, "database query")

      expect(error.code).toBe("TIMEOUT")
      expect(error.message).toBe("Request timeout: database query exceeded 30000ms")
      expect(error.status).toBe(408)
      expect(error.context).toEqual({
        duration: 30000,
        operation: "database query",
      })
    })
  })

  describe("type checking", () => {
    it("should correctly identify TypedError instances", () => {
      const error = TypedError.validation("field", "value", "is required")
      const regularError = new Error("Not a typed error")

      expect(TypedError.isTypedError(error)).toBe(true)
      expect(TypedError.isTypedError(regularError)).toBe(false)
      expect(TypedError.isTypedError(null)).toBe(false)
      expect(TypedError.isTypedError(undefined)).toBe(false)
      expect(TypedError.isTypedError({})).toBe(false)
    })

    it("should correctly check error codes", () => {
      const validationError = TypedError.validation("field", "value", "is required")
      const networkError = TypedError.network("https://api.example.com", "GET")

      expect(TypedError.hasCode(validationError, "VALIDATION_FAILED")).toBe(true)
      expect(TypedError.hasCode(validationError, "NETWORK_ERROR")).toBe(false)
      expect(TypedError.hasCode(networkError, "NETWORK_ERROR")).toBe(true)
      expect(TypedError.hasCode(networkError, "VALIDATION_FAILED")).toBe(false)
    })
  })

  describe("error properties", () => {
    it("should include timestamp in all errors", () => {
      const error = TypedError.validation("field", "value", "is required")

      expect(error.timestamp).toBeDefined()
      expect(new Date(error.timestamp).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it("should include trace ID when provided", () => {
      const error = TypedError.validation("field", "value", "is required")
      expect(error.traceId).toBeUndefined()

      const errorWithTrace = TypedError(
        "NETWORK_ERROR",
        "Network error: connection failed",
        { url: "https://api.example.com", method: "GET" },
        { traceId: "trace-123" },
      )
      expect(errorWithTrace.traceId).toBe("trace-123")
    })

    it("should inherit from Throwable", () => {
      const error = TypedError.validation("field", "value", "is required")

      expect(error._tag).toBe("Throwable")
      expect(error.name).toBe("VALIDATION_FAILED")
      expect(typeof error.toString).toBe("function")
    })
  })

  describe("compile-time type safety", () => {
    it("should enforce correct error message types", () => {
      // This is a compile-time test - TypeScript will enforce these constraints

      // Valid message for VALIDATION_FAILED
      const validationMsg: ErrorMessage<"VALIDATION_FAILED"> = "Validation failed: test"

      // Valid message for NETWORK_ERROR
      const networkMsg: ErrorMessage<"NETWORK_ERROR"> = "Network error: connection failed"

      // Valid message for AUTH_REQUIRED
      const authMsg: ErrorMessage<"AUTH_REQUIRED"> = "Authentication required: admin panel"

      // These would fail at compile time:
      // const badValidation: ErrorMessage<"VALIDATION_FAILED"> = "Network error: test"
      // const badNetwork: ErrorMessage<"NETWORK_ERROR"> = "Validation failed: test"

      expect(validationMsg).toBeDefined()
      expect(networkMsg).toBeDefined()
      expect(authMsg).toBeDefined()
    })

    it("should enforce correct status codes", () => {
      // This is a compile-time test - TypeScript will enforce these constraints

      const validationStatus: ErrorStatus<"VALIDATION_FAILED"> = 400
      const authStatus: ErrorStatus<"AUTH_REQUIRED"> = 401
      const notFoundStatus: ErrorStatus<"NOT_FOUND"> = 404
      const conflictStatus: ErrorStatus<"CONFLICT"> = 409
      const rateLimitStatus: ErrorStatus<"RATE_LIMITED"> = 429
      const internalStatus: ErrorStatus<"INTERNAL_ERROR"> = 500
      const networkStatus: ErrorStatus<"NETWORK_ERROR"> = 503

      expect(validationStatus).toBe(400)
      expect(authStatus).toBe(401)
      expect(notFoundStatus).toBe(404)
      expect(conflictStatus).toBe(409)
      expect(rateLimitStatus).toBe(429)
      expect(internalStatus).toBe(500)
      expect(networkStatus).toBe(503)
    })

    it("should enforce correct context types", () => {
      // This is a compile-time test - TypeScript will enforce these constraints

      const validationContext: TypedErrorContext<"VALIDATION_FAILED"> = {
        field: "email",
        value: "test@example.com",
        rule: "must be unique",
      }

      const networkContext: TypedErrorContext<"NETWORK_ERROR"> = {
        url: "https://api.example.com",
        method: "POST",
        statusCode: 500,
      }

      const authContext: TypedErrorContext<"AUTH_REQUIRED"> = {
        resource: "/api/admin",
        requiredRole: "admin",
      }

      expect(validationContext).toBeDefined()
      expect(networkContext).toBeDefined()
      expect(authContext).toBeDefined()
    })
  })

  describe("real-world usage", () => {
    it("should handle API error responses", () => {
      // Simulate an API error response handler
      function handleApiError(status: number, message: string): TypedError<ErrorCode> {
        switch (status) {
          case 400:
            return TypedError.badRequest(message)
          case 401:
            return TypedError.auth("/api/endpoint")
          case 403:
            return TypedError.permission("access", "resource")
          case 404:
            return TypedError.notFound("resource", "unknown")
          case 429:
            return TypedError.rateLimit(100, "1h")
          case 500:
            return TypedError.internal(`ERR-${Date.now()}`)
          default:
            return TypedError.network("/api/endpoint", "GET", status)
        }
      }

      const error400 = handleApiError(400, "Invalid request data")
      expect(error400.code).toBe("BAD_REQUEST")
      expect(error400.status).toBe(400)

      const error401 = handleApiError(401, "Token expired")
      expect(error401.code).toBe("AUTH_REQUIRED")
      expect(error401.status).toBe(401)

      const error503 = handleApiError(503, "Service unavailable")
      expect(error503.code).toBe("NETWORK_ERROR")
      expect(error503.status).toBe(503)
    })

    it("should work with error handling patterns", () => {
      function performOperation(): TypedError<ErrorCode> | { success: true; data: string } {
        // Simulate various error conditions
        const condition = Math.random()

        if (condition < 0.2) {
          return TypedError.validation("input", "test", "is invalid")
        } else if (condition < 0.4) {
          return TypedError.network("https://api.example.com", "GET", 500)
        } else if (condition < 0.6) {
          return TypedError.permission("read", "data")
        } else {
          return { success: true, data: "Operation successful" }
        }
      }

      const result = performOperation()

      if (TypedError.isTypedError(result)) {
        // Handle specific error types
        if (TypedError.hasCode(result, "VALIDATION_FAILED")) {
          expect(result.context.field).toBeDefined()
          expect(result.context.rule).toBeDefined()
        } else if (TypedError.hasCode(result, "NETWORK_ERROR")) {
          expect(result.context.url).toBeDefined()
          expect(result.context.method).toBeDefined()
        } else if (TypedError.hasCode(result, "PERMISSION_DENIED")) {
          expect(result.context.action).toBeDefined()
          expect(result.context.resource).toBeDefined()
        }

        expect(result.status).toBeGreaterThanOrEqual(400)
      } else {
        expect(result.success).toBe(true)
        expect(result.data).toBeDefined()
      }
    })
  })
})
