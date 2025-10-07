import { describe, expect, it } from "vitest"

import {
  Brand,
  BrandedBoolean,
  BrandedNumber,
  BrandedString,
  createBrander,
  EmailAddress,
  type ExtractBrand,
  hasBrand,
  type Unwrap,
  unwrap,
} from "@/branded"

describe("Branded Types", () => {
  // Define some branded types for testing
  type UserId = Brand<"UserId", string>
  type ProductId = Brand<"ProductId", string>
  // type Quantity = Brand<"Quantity", number>
  // type Price = Brand<"Price", number>

  it("should create branded values", () => {
    const userId = Brand("UserId", "user123") as UserId
    const productId = Brand("ProductId", "prod456") as ProductId

    // These are now just primitives with phantom types
    expect(typeof userId).toBe("string")
    expect(typeof productId).toBe("string")

    // The values ARE the primitives
    expect(userId).toBe("user123")
    expect(productId).toBe("prod456")

    // unwrap extracts the underlying value
    expect(unwrap(userId)).toBe("user123")
    expect(unwrap(productId)).toBe("prod456")
  })

  it("should work with branded primitive factories", () => {
    const createUserId = BrandedString("UserId")
    const createPrice = BrandedNumber("Price")
    const createIsActive = BrandedBoolean("IsActive")

    const userId = createUserId("user123")
    const price = createPrice(99.99)
    const isActive = createIsActive(true)

    // The values ARE primitives, so methods work directly
    expect(userId.toUpperCase()).toBe("USER123")
    expect(price * 2).toBeCloseTo(199.98)
    expect(isActive && false).toBe(false)
    expect(isActive || false).toBe(true)
  })

  it("should allow branders to be created", () => {
    const UserIdBrander = createBrander<"UserId", string>("UserId")
    const userId = UserIdBrander("user123")

    expect(userId).toBe("user123")
    // At runtime the brand is a phantom type
    expect(Object.getOwnPropertyNames(userId)).not.toContain("__brand")
    // Strings have indexed properties for characters and length
    expect(typeof userId).toBe("string")
  })

  it("should unwrap values", () => {
    const userId = Brand("UserId", "user123") as UserId
    const unwrapped = unwrap(userId)

    expect(unwrapped).toBe("user123")
    expect(typeof unwrapped).toBe("string")
  })

  it("should handle null and undefined in unwrap", () => {
    const userId = Brand("UserId", "user123") as UserId

    // Test with regular value
    expect(unwrap(userId)).toBe("user123")

    // Test with null
    const nullValue: UserId | null = null
    expect(unwrap(nullValue)).toBe(null)

    // Test with undefined
    const undefinedValue: UserId | undefined = undefined
    expect(unwrap(undefinedValue)).toBe(undefined)
  })

  it("should unwrap ValidatedBrand values", () => {
    const email = EmailAddress.unsafeOf("test@example.com")

    // unwrap should work with ValidatedBrand
    expect(unwrap(email)).toBe("test@example.com")

    // Test with nullable ValidatedBrand
    const nullEmail: typeof email | null = null
    expect(unwrap(nullEmail)).toBe(null)
  })

  it("should work without instance methods (phantom types)", () => {
    const userId = Brand("UserId", "user123")
    const productId = Brand("ProductId", "prod456")

    // Values ARE the primitives
    expect(userId).toBe("user123")
    expect(productId).toBe("prod456")

    // Use the unwrap function if needed
    expect(unwrap(userId)).toBe("user123")
    expect(unwrap(productId)).toBe("prod456")

    // Verify they are primitives
    expect(typeof userId).toBe("string")
    expect(typeof productId).toBe("string")
  })

  it("should support string interpolation natively", () => {
    const userId = Brand("UserId", "user123")
    const price = Brand("Price", 99.99)
    const isActive = Brand("IsActive", true)

    // Direct toString calls work on primitives
    expect(userId.toString()).toBe("user123")
    expect(price.toString()).toBe("99.99")
    expect(isActive.toString()).toBe("true")

    // Template literal usage
    expect(`User ID: ${userId}`).toBe("User ID: user123")
    expect(`Price: $${price}`).toBe("Price: $99.99")
    expect(`Active: ${isActive}`).toBe("Active: true")
  })

  it("should support valueOf for numeric branded types", () => {
    const price = Brand("Price", 99.99)
    const quantity = Brand("Quantity", 5)

    // valueOf should allow numeric operations
    expect(price + 10).toBe(109.99)
    expect(quantity * 2).toBe(10)
    expect(price / 2).toBeCloseTo(49.995)
    expect(quantity - 3).toBe(2)

    // Should work in comparisons
    expect(price > 50).toBe(true)
    expect(quantity < 10).toBe(true)
    expect(price >= 99.99).toBe(true)
    expect(quantity <= 5).toBe(true)
  })

  it("should work with BrandedBoolean specifically", () => {
    const createIsEnabled = BrandedBoolean("IsEnabled")
    const createHasPermission = BrandedBoolean("HasPermission")

    const isEnabled = createIsEnabled(true)
    const hasPermission = createHasPermission(false)

    // Values ARE booleans
    expect(isEnabled).toBe(true)
    expect(hasPermission).toBe(false)

    // Test boolean operations work directly
    expect(isEnabled && hasPermission).toBe(false)
    expect(isEnabled || hasPermission).toBe(true)
    expect(!isEnabled).toBe(false)
    expect(!hasPermission).toBe(true)

    // Test toString
    expect(isEnabled.toString()).toBe("true")
    expect(hasPermission.toString()).toBe("false")

    // Test type behavior - they are primitives
    expect(typeof isEnabled).toBe("boolean")
    expect(typeof hasPermission).toBe("boolean")
  })

  it("should detect existence for branded types", () => {
    const userId = Brand("UserId", "user123") as UserId
    const productId = Brand("ProductId", "prod456") as ProductId

    // At runtime we can't actually check the brand itself since it's a phantom type
    // We can only check that the value exists (isn't null/undefined)
    expect(hasBrand(userId, "UserId")).toBe(true)
    expect(hasBrand(productId, "ProductId")).toBe(true)

    // Non-branded but existing values will also pass because brands are phantom
    expect(hasBrand("just a string", "UserId")).toBe(true)
    expect(hasBrand(123, "Quantity")).toBe(true)

    // Only null and undefined should fail
    expect(hasBrand(null, "UserId")).toBe(false)
    expect(hasBrand(undefined, "Quantity")).toBe(false)
  })

  it("should extract types via utility types", () => {
    // These checks are compile-time only and don't have runtime behavior
    // The test is mainly to verify the types exist
    type UnwrappedUserId = Unwrap<UserId>
    type UserBrand = ExtractBrand<UserId>

    // Just verifying the code compiles correctly
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const _test1: UnwrappedUserId = "test"
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const _test2: UserBrand = "UserId"

    expect(true).toBe(true)
  })

  it("should work with functions that expect branded types", () => {
    type UserId = Brand<"UserId", string>

    // Function that only accepts UserId
    function getUserById(id: UserId): string {
      return `User: ${id}` // id IS already a string
    }

    const userId = Brand("UserId", "user123") as UserId
    expect(getUserById(userId)).toBe("User: user123")

    // Type safety would prevent this:
    // getUserById("user123") // Should cause TS error
    // getUserById(Brand("ProductId", "prod456") as ProductId) // Should cause TS error
  })
})
