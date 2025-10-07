/**
 * Branded Types Examples for Context7 Integration
 *
 * This file contains compilable examples for Brand and ValidatedBrand usage patterns.
 * Examples are structured to be discoverable by AI tools and provide real-world patterns.
 */

// Example compilable code (verified by importing)
import { Brand, BrandedBoolean, BrandedNumber, BrandedString, ValidatedBrand } from "@/branded"
import { Either } from "@/either"
import { Option } from "@/option"

// Verify imports work
void [Brand, ValidatedBrand, BrandedString, BrandedNumber, BrandedBoolean, Option, Either]

// Import unwrap function for examples
import { unwrap } from "@/branded"

export const brandExamples = {
  basic: () => {
    // Basic branded type creation
    const userId = Brand("UserId", "user-123")
    const productId = Brand("ProductId", "prod-456")

    // Values ARE primitives - no unwrap needed
    return {
      userId, // "user-123" - it IS a string
      userIdStr: userId.toString(), // "user-123" - standard string method
      productId, // "prod-456"
      // Can use unwrap function if needed for clarity
      userIdUnwrapped: unwrap(userId), // "user-123"
    }
  },

  primitiveFactories: () => {
    // Using branded primitive factories
    const createEmail = BrandedString("Email")
    const createAge = BrandedNumber("Age")
    const createIsActive = BrandedBoolean("IsActive")

    const email = createEmail("user@example.com")
    const age = createAge(25)
    const isActive = createIsActive(true)

    return {
      email, // "user@example.com" - it IS a string
      emailStr: email.toString(), // "user@example.com"
      age, // 25 - it IS a number
      canVote: age >= 18, // true - numeric operations work directly
      status: isActive, // true - it IS a boolean
    }
  },

  typeSafety: () => {
    // Function that only accepts specific branded type
    function getUserProfile(id: Brand<"UserId", string>): string {
      return `Profile for user: ${id}` // id IS a string
    }

    const userId = Brand("UserId", "user-123")
    const email = Brand("Email", "user@example.com")

    // This works - Brand() returns the correct branded type
    const profile = getUserProfile(userId)

    // These would cause TypeScript errors:
    // getUserProfile(email)  // Error: Brand<"Email", string> is not assignable to Brand<"UserId", string>
    // getUserProfile("user-123")  // Error: string is not assignable to Brand<"UserId", string>

    return { profile, email } // email IS a string
  },
}

export const validatedBrandExamples = {
  basicValidation: () => {
    // Create validators with runtime checks
    const Email = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))
    const PositiveNumber = ValidatedBrand("PositiveNumber", (n: number) => n > 0)

    // Safe creation with Option
    const validEmail = Email.of("user@example.com") // Some(Brand<"Email", string>)
    const invalidEmail = Email.of("not-an-email") // None

    const validNumber = PositiveNumber.of(42) // Some(Brand<"PositiveNumber", number>)

    return {
      hasValidEmail: !validEmail.isEmpty,
      hasInvalidEmail: invalidEmail.isEmpty,
      // Better: use fold to work with branded values naturally
      validEmailValue: validEmail.fold(
        () => "",
        (email) => email, // email IS a string, works directly!
      ),
      hasValidNumber: !validNumber.isEmpty,
      validNumberValue: validNumber.fold(
        () => 0,
        (num) => num, // num IS a number, works directly!
      ),
    }
  },

  errorHandling: () => {
    const Email = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))

    // Using Either for detailed error messages
    const validResult = Email.from("user@example.com") // Right(Brand<"Email", string>)
    const invalidResult = Email.from("invalid") // Left("Invalid Email: validation failed")

    return {
      // Use fold for clean handling
      validEmail: validResult.fold(
        () => "no-email",
        (email) => email, // email IS a string
      ),
      validError: validResult.fold(
        () => "none",
        () => "success",
      ),
      invalidEmail: invalidResult.fold(
        () => "fallback",
        (email) => email, // email IS a string
      ),
      invalidError: invalidResult.fold(
        (err) => err,
        () => "no error",
      ),
    }
  },

  realWorldExample: () => {
    // Domain modeling with branded types
    const EmailValidator = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))

    // Safe user creation
    const createUser = (id: string, email: string) => {
      return EmailValidator.of(email).map((validEmail) => ({
        id: Brand("UserId", id),
        email: validEmail,
        isActive: true,
      }))
    }

    const user = createUser("user-123", "john@example.com")
    const invalidUser = createUser("user-456", "invalid-email")

    return {
      hasValidUser: !user.isEmpty,
      // Clean extraction with fold
      userEmail: user.fold(
        () => "",
        (u) => u.email, // u.email IS a string!
      ),
      hasInvalidUser: invalidUser.isEmpty,
    }
  },
}
