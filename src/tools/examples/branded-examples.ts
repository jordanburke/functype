/**
 * Branded Types Examples for Context7 Integration
 * 
 * This file contains compilable examples for Brand and ValidatedBrand usage patterns.
 * Examples are structured to be discoverable by AI tools and provide real-world patterns.
 */

// Example compilable code (verified by importing)
import { Brand, ValidatedBrand, BrandedString, BrandedNumber, BrandedBoolean } from "@/branded"
import { Option } from "@/option"
import { Either } from "@/either"

// Verify imports work
void [Brand, ValidatedBrand, BrandedString, BrandedNumber, BrandedBoolean, Option, Either]

export const brandExamples = {
  basic: () => {
    // Basic branded type creation
    const userId = Brand("UserId", "user-123")
    const productId = Brand("ProductId", "prod-456")
    
    // Access original values with instance methods
    return {
      userId: userId.unbrand(),      // "user-123"
      userIdStr: userId.toString(),  // "UserId(user-123)"
      productId: productId.unwrap(), // "prod-456"
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
      email: email.unbrand(),           // "user@example.com"
      emailStr: email.toString(),       // "Email(user@example.com)"
      age: age.unbrand(),               // 25
      canVote: age.unbrand() >= 18,     // true
      status: isActive.unbrand(),       // true
    }
  },

  typeSafety: () => {
    // Function that only accepts specific branded type
    function getUserProfile(id: Brand<"UserId", string>): string {
      return `Profile for user: ${id.unbrand()}`
    }
    
    const userId = Brand("UserId", "user-123")
    const email = Brand("Email", "user@example.com")
    
    // This works - Brand() returns the correct branded type
    const profile = getUserProfile(userId)
    
    // These would cause TypeScript errors:
    // getUserProfile(email)  // Error: Brand<"Email", string> is not assignable to Brand<"UserId", string>
    // getUserProfile("user-123")  // Error: string is not assignable to Brand<"UserId", string>
    
    return { profile, email: email.unbrand() }
  },
}

export const validatedBrandExamples = {
  basicValidation: () => {
    // Create validators with runtime checks
    const Email = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))
    const PositiveNumber = ValidatedBrand("PositiveNumber", (n: number) => n > 0)
    
    // Safe creation with Option
    const validEmail = Email.of("user@example.com")     // Some(Brand<"Email", string>)
    const invalidEmail = Email.of("not-an-email")       // None
    
    const validNumber = PositiveNumber.of(42)           // Some(Brand<"PositiveNumber", number>)
    
    return {
      hasValidEmail: !validEmail.isEmpty,
      hasInvalidEmail: invalidEmail.isEmpty,
      validEmailValue: validEmail.map(e => e.unbrand()).getOrElse(""),
      hasValidNumber: !validNumber.isEmpty,
      validNumberValue: validNumber.map(n => n.unbrand()).getOrElse(0),
    }
  },

  errorHandling: () => {
    const Email = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))
    
    // Using Either for detailed error messages
    const validResult = Email.from("user@example.com")   // Right(Brand<"Email", string>)
    const invalidResult = Email.from("invalid")          // Left("Invalid Email: validation failed")
    
    return {
      validEmail: validResult.map(e => e.unbrand()).getOrElse(""),
      validError: validResult.fold(() => "none", () => "success"),
      invalidEmail: invalidResult.map(e => e.unbrand()).getOrElse("fallback"),
      invalidError: invalidResult.fold(err => err, () => "no error"),
    }
  },

  realWorldExample: () => {
    // Domain modeling with branded types
    const EmailValidator = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))
    
    // Safe user creation 
    const createUser = (id: string, email: string) => {
      return EmailValidator.of(email).map(validEmail => ({
        id: Brand("UserId", id),
        email: validEmail,
        isActive: true,
      }))
    }
    
    const user = createUser("user-123", "john@example.com")
    const invalidUser = createUser("user-456", "invalid-email")
    
    return {
      hasValidUser: !user.isEmpty,
      userEmail: user.map(u => u.email.unbrand()).getOrElse(""),
      hasInvalidUser: invalidUser.isEmpty,
    }
  },
}