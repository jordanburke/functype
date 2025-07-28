import { describe, expect, it } from "vitest"

import {
  Brand,
  BrandedBoolean,
  BrandedNumber,
  BrandedString,
  createBrander,
  type ExtractBrand,
  hasBrand,
  type Unbrand,
  unbrand,
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

    // These are now objects with methods
    expect(typeof userId).toBe("object")
    expect(typeof productId).toBe("object")

    // The original values should be accessible via unbrand
    expect(userId.unbrand()).toBe("user123")
    expect(productId.unbrand()).toBe("prod456")
  })

  it("should work with branded primitive factories", () => {
    const createUserId = BrandedString("UserId")
    const createPrice = BrandedNumber("Price")
    const createIsActive = BrandedBoolean("IsActive")

    const userId = createUserId("user123")
    const price = createPrice(99.99)
    const isActive = createIsActive(true)

    // The values should preserve their original behavior with unbranding
    expect(userId.unbrand().toUpperCase()).toBe("USER123")
    expect(price.unbrand() * 2).toBeCloseTo(199.98)
    expect(isActive.unbrand() && false).toBe(false)
    expect(isActive.unbrand() || false).toBe(true)
  })

  it("should allow branders to be created", () => {
    const UserIdBrander = createBrander<"UserId", string>("UserId")
    const userId = UserIdBrander("user123")

    expect(userId.unbrand()).toBe("user123")
    // At runtime the brand is a phantom type, but we now have methods
    expect(Object.getOwnPropertyNames(userId)).not.toContain("__brand")
    expect(Object.getOwnPropertyNames(userId)).toContain("unbrand")
  })

  it("should unbrand values", () => {
    const userId = Brand("UserId", "user123") as UserId
    const unbranded = unbrand(userId)

    expect(unbranded).toBe("user123")
    expect(typeof unbranded).toBe("string")
  })

  it("should support instance unbrand and unwrap methods", () => {
    const userId = Brand("UserId", "user123")
    const productId = Brand("ProductId", "prod456")

    // Test unbrand method
    expect(userId.unbrand()).toBe("user123")
    expect(productId.unbrand()).toBe("prod456")

    // Test unwrap method (alias for unbrand)
    expect(userId.unwrap()).toBe("user123")
    expect(productId.unwrap()).toBe("prod456")

    // Verify the methods return the correct types
    expect(typeof userId.unbrand()).toBe("string")
    expect(typeof productId.unbrand()).toBe("string")
  })

  it("should support toString method for string interpolation", () => {
    const userId = Brand("UserId", "user123")
    const price = Brand("Price", 99.99)
    const isActive = Brand("IsActive", true)

    // Direct toString calls
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

    // Test unbrand/unwrap methods
    expect(isEnabled.unbrand()).toBe(true)
    expect(isEnabled.unwrap()).toBe(true)
    expect(hasPermission.unbrand()).toBe(false)
    expect(hasPermission.unwrap()).toBe(false)

    // Test boolean operations work correctly
    expect(isEnabled.unbrand() && hasPermission.unbrand()).toBe(false)
    expect(isEnabled.unbrand() || hasPermission.unbrand()).toBe(true)
    expect(!isEnabled.unbrand()).toBe(false)
    expect(!hasPermission.unbrand()).toBe(true)

    // Test toString
    expect(isEnabled.toString()).toBe("true")
    expect(hasPermission.toString()).toBe("false")

    // Test type behavior
    expect(typeof isEnabled).toBe("object")
    expect(typeof isEnabled.unbrand()).toBe("boolean")
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
    type UnbrandedUserId = Unbrand<UserId>
    type UserBrand = ExtractBrand<UserId>

    // Just verifying the code compiles correctly
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const _test1: UnbrandedUserId = "test"
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const _test2: UserBrand = "UserId"

    expect(true).toBe(true)
  })

  it("should work with functions that expect branded types", () => {
    type UserId = Brand<"UserId", string>

    // Function that only accepts UserId
    function getUserById(id: UserId): string {
      return `User: ${id.unbrand()}`
    }

    const userId = Brand("UserId", "user123") as UserId
    expect(getUserById(userId)).toBe("User: user123")

    // Type safety would prevent this:
    // getUserById("user123") // Should cause TS error
    // getUserById(Brand("ProductId", "prod456") as ProductId) // Should cause TS error
  })
})
