import { describe, expect, it } from "vitest"

import {
  BoundedNumber,
  BoundedString,
  type Brand,
  EmailAddress,
  NonEmptyString,
  PatternString,
  PositiveNumber,
  UUID,
  ValidatedBrand,
  type ValidatedBrand as ValidatedBrandType,
} from "@/branded"

describe("ValidatedBrand", () => {
  describe("ValidatedBrand as subtype of Brand", () => {
    it("should allow ValidatedBrand to be assigned to Brand without casting", () => {
      const emailValidated: ValidatedBrandType<"EmailAddress", string> = EmailAddress.unsafeOf("test@example.com")
      const emailBrand: Brand<"EmailAddress", string> = emailValidated // No cast needed!

      expect(emailBrand).toBe(emailValidated)
      expect(emailBrand).toBe("test@example.com")
    })

    it("should work with function parameters expecting Brand", () => {
      // Function that accepts a simple Brand
      function processEmail(email: Brand<"EmailAddress", string>): string {
        return `Processing: ${email}`
      }

      const validatedEmail = EmailAddress.unsafeOf("user@example.com")
      // Should be able to pass ValidatedBrand where Brand is expected
      const result = processEmail(validatedEmail)

      expect(result).toBe("Processing: user@example.com")
    })

    it("should enable seamless conversion when using same brand names", () => {
      // Create ValidatedBrand and simple Brand with the SAME brand name
      const ValidatedUserId = ValidatedBrand("UserId", (s: string) => s.length > 0)

      const validatedId = ValidatedUserId.unsafeOf("user123")
      const simpleId: Brand<"UserId", string> = validatedId // No cast needed!

      expect(simpleId).toBe(validatedId)
      expect(simpleId).toBe("user123")
    })

    it("should work in real-world conversion scenarios", () => {
      // Simulate the user's use case
      const ValidatedVideoId = ValidatedBrand("VideoId", (s: string) => /^[a-f0-9-]{36}$/.test(s))
      type ValidatedVideoId =
        ReturnType<typeof ValidatedVideoId.of> extends import("@/option").Option<infer T> ? T : never
      type VideoId = Brand<"VideoId", string>

      // Conversion function without casting
      const toSimpleVideoId = (id: ValidatedVideoId): VideoId => id

      const validatedId = ValidatedVideoId.unsafeOf("550e8400-e29b-41d4-a716-446655440000")
      const simpleId = toSimpleVideoId(validatedId)

      expect(simpleId).toBe(validatedId)
      expect(typeof simpleId).toBe("string")
    })

    it("should maintain type safety - cannot assign regular string to ValidatedBrand", () => {
      const regularString = "not-an-email"
      // @ts-expect-error - Cannot assign string to ValidatedBrand
      const email: ValidatedBrandType<"EmailAddress", string> = regularString
    })

    it("should work with arrays of mixed Brand and ValidatedBrand", () => {
      const SimpleBrand = (value: string): Brand<"UserId", string> => value as Brand<"UserId", string>
      const ValidatedUserId = ValidatedBrand("UserId", (s: string) => s.length > 0)

      const simpleBrand = SimpleBrand("user1")
      const validatedBrand = ValidatedUserId.unsafeOf("user2")

      // Array that accepts Brand should accept both
      const users: Brand<"UserId", string>[] = [simpleBrand, validatedBrand]

      expect(users).toHaveLength(2)
      expect(users[0]).toBe("user1")
      expect(users[1]).toBe("user2")
    })
  })
  describe("PositiveNumber", () => {
    it("should accept positive numbers", () => {
      const result = PositiveNumber.of(5)
      expect(result.isEmpty).toBe(false)
      // Use fold for cleaner extraction
      expect(
        result.fold(
          () => 0,
          (n) => n,
        ),
      ).toBe(5)
    })

    it("should return primitive values from validated brands", () => {
      const result = PositiveNumber.of(42)
      expect(result.isEmpty).toBe(false)

      const branded = result.getOrThrow()
      // Branded value IS the primitive
      expect(branded).toBe(42)
      expect(typeof branded).toBe("number")
      expect(branded.toString()).toBe("42")

      // Can use unwrap from ValidatedBrand if needed
      expect(PositiveNumber.unwrap(branded)).toBe(42)
    })

    it("should reject zero and negative numbers", () => {
      expect(PositiveNumber.of(0).isEmpty).toBe(true)
      expect(PositiveNumber.of(-5).isEmpty).toBe(true)
    })

    it("should provide detailed errors with from", () => {
      const result = PositiveNumber.from(-5)
      expect(result._tag).toBe("Left")
      expect(result.value).toContain("Invalid PositiveNumber")
    })

    it("should throw on unsafeOf with invalid value", () => {
      expect(() => PositiveNumber.unsafeOf(-5)).toThrow("Invalid PositiveNumber")
    })

    it("should work as type guard", () => {
      expect(PositiveNumber.is(5)).toBe(true)
      expect(PositiveNumber.is(-5)).toBe(false)
      expect(PositiveNumber.is("not a number")).toBe(false)
    })
  })

  describe("NonEmptyString", () => {
    it("should accept non-empty strings", () => {
      const result = NonEmptyString.of("hello")
      expect(result.isEmpty).toBe(false)
    })

    it("should reject empty strings", () => {
      expect(NonEmptyString.of("").isEmpty).toBe(true)
    })
  })

  describe("EmailAddress", () => {
    it("should accept valid email addresses", () => {
      const validEmails = ["test@example.com", "user.name@domain.co.uk", "first.last@sub.domain.com"]

      validEmails.forEach((email) => {
        expect(EmailAddress.of(email).isEmpty).toBe(false)
      })
    })

    it("should reject invalid email addresses", () => {
      const invalidEmails = ["notanemail", "@example.com", "test@", "test @example.com", ""]

      invalidEmails.forEach((email) => {
        expect(EmailAddress.of(email).isEmpty).toBe(true)
      })
    })
  })

  describe("UUID", () => {
    it("should accept valid UUIDs", () => {
      const validUUIDs = ["123e4567-e89b-12d3-a456-426614174000", "A987FBC9-4BED-3078-CF07-9141BA07C9F3"]

      validUUIDs.forEach((uuid) => {
        expect(UUID.of(uuid).isEmpty).toBe(false)
      })
    })

    it("should reject invalid UUIDs", () => {
      const invalidUUIDs = ["123e4567-e89b-12d3-a456", "not-a-uuid", "123e4567-e89b-12d3-a456-42661417400g"]

      invalidUUIDs.forEach((uuid) => {
        expect(UUID.of(uuid).isEmpty).toBe(true)
      })
    })
  })

  describe("BoundedNumber", () => {
    it("should create bounded number brands", () => {
      const Percentage = BoundedNumber("Percentage", 0, 100)

      expect(Percentage.of(50).isEmpty).toBe(false)
      expect(Percentage.of(0).isEmpty).toBe(false)
      expect(Percentage.of(100).isEmpty).toBe(false)
      expect(Percentage.of(-1).isEmpty).toBe(true)
      expect(Percentage.of(101).isEmpty).toBe(true)
    })
  })

  describe("BoundedString", () => {
    it("should create bounded string brands", () => {
      const Username = BoundedString("Username", 3, 20)

      expect(Username.of("john").isEmpty).toBe(false)
      expect(Username.of("ab").isEmpty).toBe(true)
      expect(Username.of("a".repeat(21)).isEmpty).toBe(true)
    })
  })

  describe("PatternString", () => {
    it("should create pattern-based string brands", () => {
      const HexColor = PatternString("HexColor", /^#[0-9a-f]{6}$/i)

      expect(HexColor.of("#ff0000").isEmpty).toBe(false)
      expect(HexColor.of("#FF00AA").isEmpty).toBe(false)
      expect(HexColor.of("ff0000").isEmpty).toBe(true)
      expect(HexColor.of("#ff00").isEmpty).toBe(true)
    })
  })

  describe("refine", () => {
    it("should allow refining existing brands", () => {
      const SmallPositiveInteger = PositiveNumber.refine("SmallPositiveInteger", (n) => {
        // n is already a number (phantom type)
        return n < 100 && Number.isInteger(n)
      })

      // First create PositiveNumber brands, then refine them
      const fifty = PositiveNumber.unsafeOf(50)
      const fiftyPointFive = PositiveNumber.unsafeOf(50.5)
      const oneFifty = PositiveNumber.unsafeOf(150)

      expect(SmallPositiveInteger.of(fifty).isEmpty).toBe(false)
      expect(SmallPositiveInteger.of(fiftyPointFive).isEmpty).toBe(true)
      expect(SmallPositiveInteger.of(oneFifty).isEmpty).toBe(true)

      // This should fail at the PositiveNumber level, not SmallPositiveInteger
      expect(PositiveNumber.of(-5).isEmpty).toBe(true)
    })
  })

  describe("custom validated brand", () => {
    it("should allow creating custom validated brands", () => {
      const Port = ValidatedBrand("Port", (n: number) => Number.isInteger(n) && n >= 1 && n <= 65535)

      expect(Port.of(8080).isEmpty).toBe(false)
      expect(Port.of(80).isEmpty).toBe(false)
      expect(Port.of(0).isEmpty).toBe(true)
      expect(Port.of(70000).isEmpty).toBe(true)
      expect(Port.of(8080.5).isEmpty).toBe(true)
    })
  })

  describe("toString behavior", () => {
    it("should serialize correctly in template literals", () => {
      const TenantId = ValidatedBrand("TenantId", (s: string) => UUID.validate(s))
      const id = TenantId.unsafeOf("12345678-1234-4234-9234-123456789012")
      expect(`prefix-${id}-suffix`).toBe("prefix-12345678-1234-4234-9234-123456789012-suffix")
    })

    it("should work with String constructor", () => {
      const BrandedId = ValidatedBrand("BrandedId", (s: string) => s.length > 0)
      const id = BrandedId.unsafeOf("test-123")
      expect(String(id)).toBe("test-123")
    })

    it("should work with explicit toString call", () => {
      const BrandedId = ValidatedBrand("BrandedId", (s: string) => s.length > 0)
      const id = BrandedId.unsafeOf("test-123")
      expect(id.toString()).toBe("test-123")
    })

    it("should work in path construction", () => {
      const TenantId = ValidatedBrand("TenantId", (s: string) => UUID.validate(s))
      const ProjectId = ValidatedBrand("ProjectId", (s: string) => UUID.validate(s))
      const WorkspaceId = ValidatedBrand("WorkspaceId", (s: string) => UUID.validate(s))

      const tenantId = TenantId.unsafeOf("12345678-1234-4234-9234-123456789012")
      const projectId = ProjectId.unsafeOf("87654321-4321-4321-4321-098765432109")
      const workspaceId = WorkspaceId.unsafeOf("abcdef12-3456-7890-abcd-ef1234567890")

      const filePath = `tenants/${tenantId}/projects/${projectId}/workspaces/${workspaceId}/file.txt`
      expect(filePath).toBe(
        "tenants/12345678-1234-4234-9234-123456789012/projects/87654321-4321-4321-4321-098765432109/workspaces/abcdef12-3456-7890-abcd-ef1234567890/file.txt",
      )
    })

    it("should work with numeric branded types", () => {
      const port = PositiveNumber.unsafeOf(8080)
      expect(`http://localhost:${port}`).toBe("http://localhost:8080")
    })

    it("should work with array join", () => {
      const ids = [
        NonEmptyString.unsafeOf("first"),
        NonEmptyString.unsafeOf("second"),
        NonEmptyString.unsafeOf("third"),
      ]
      expect(ids.join(", ")).toBe("first, second, third")
    })

    it("should support valueOf for numeric branded types", () => {
      const Port = BoundedNumber("Port", 1, 65535)
      const port = Port.unsafeOf(8080)

      // Numeric operations should work
      expect(port + 10).toBe(8090)
      expect(port * 2).toBe(16160)
      expect(port / 2).toBe(4040)
      expect(port - 80).toBe(8000)

      // Comparisons should work
      expect(port > 8000).toBe(true)
      expect(port < 9000).toBe(true)
      expect(port >= 8080).toBe(true)
      expect(port <= 8080).toBe(true)
    })
  })
})
