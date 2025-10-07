/**
 * Registry of all compilable examples
 *
 * This ensures all examples are compile-tested by importing the actual files
 */

// Import working example modules
import * as brandedExamples from "./branded-examples"
import * as lazyExamples from "./lazy-examples"
import * as setExamples from "./set-examples"

// Verify imports exist (compile-time check)
void [setExamples, lazyExamples, brandedExamples]

import type { FunctypeExample } from "../functype-lookup"

export const compilableExamples: Record<string, FunctypeExample[]> = {
  Brand: [
    {
      title: "Basic Brand Usage",
      description: "Create branded types with instance methods",
      code: `import { Brand } from "@/branded"

type UserId = Brand<"UserId", string>
type Email = Brand<"Email", string>

const userId = Brand("UserId", "user-123")
const email = Brand("Email", "user@example.com")

// Access original values
console.log(unwrap(userId))       // "user-123"
console.log(userId.toString())    // "user-123"
console.log(unwrap(email))        // "user@example.com"`,
      category: "basic",
    },
    {
      title: "Type Safety with Functions",
      description: "Prevent mixing up similar types",
      code: `import { Brand } from "@/branded"

type UserId = Brand<"UserId", string>
type ProductId = Brand<"ProductId", string>

function getUserProfile(id: UserId): string {
  return \`Profile for: \${id}\`
}

const userId = Brand("UserId", "user-123")
const productId = Brand("ProductId", "prod-456")

getUserProfile(userId)     // Works
// getUserProfile(productId)  // TypeScript Error!`,
      category: "intermediate",
    },
    {
      title: "Branded Primitive Factories",
      description: "Use factory functions for common types",
      code: `import { BrandedString, BrandedNumber, BrandedBoolean } from "@/branded"

const createEmail = BrandedString("Email")
const createAge = BrandedNumber("Age")
const createIsActive = BrandedBoolean("IsActive")

const email = createEmail("user@example.com")
const age = createAge(25)
const isActive = createIsActive(true)

// All have instance methods
console.log(email.toString())     // "user@example.com"
console.log(age >= 18)            // true
console.log(isActive)             // true`,
      category: "basic",
    },
  ],

  ValidatedBrand: [
    {
      title: "Basic ValidatedBrand Usage",
      description: "Create validators with runtime checking",
      code: `import { ValidatedBrand } from "@/branded"

const Email = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\\.[^@]+$/.test(s))
const PositiveNumber = ValidatedBrand("PositiveNumber", (n: number) => n > 0)

// Safe creation with Option
const validEmail = Email.of("user@example.com")     // Some(Brand)
const invalidEmail = Email.of("not-an-email")       // None

// Error details with Either
const result = Email.from("user@example.com")       // Right(Brand)
const error = Email.from("invalid")                 // Left("Invalid Email: validation failed")`,
      category: "basic",
    },
    {
      title: "Pre-built Validators",
      description: "Use common validation patterns",
      code: `import { PositiveNumber, NonEmptyString, EmailAddress, UUID } from "@/branded"

const age = PositiveNumber.of(25)                    // Some(Brand<"PositiveNumber", number>)
const name = NonEmptyString.of("John")               // Some(Brand<"NonEmptyString", string>)
const email = EmailAddress.of("user@example.com")   // Some(Brand<"EmailAddress", string>)
const id = UUID.of("123e4567-e89b-12d3-a456-426614174000")  // Some(Brand<"UUID", string>)

// All return enhanced Brand objects with instance methods
if (!email.isEmpty) {
  const branded = email.get()
  console.log(branded)               // "user@example.com"
  console.log(branded.toString())    // "user@example.com"
}`,
      category: "intermediate",
    },
    {
      title: "Custom Validators",
      description: "Create domain-specific validation rules",
      code: `import { BoundedNumber, BoundedString, PatternString } from "@/branded"

// Create custom bounded validators
const Percentage = BoundedNumber("Percentage", 0, 100)
const Username = BoundedString("Username", 3, 20)
const HexColor = PatternString("HexColor", /^#[0-9a-f]{6}$/i)

const percent = Percentage.of(75)        // Some(Brand<"Percentage", number>)
const username = Username.of("johndoe")  // Some(Brand<"Username", string>)  
const color = HexColor.of("#ff0000")     // Some(Brand<"HexColor", string>)

const invalid = Percentage.of(150)       // None (out of bounds)`,
      category: "advanced",
    },
  ],

  Set: [
    {
      title: "Basic Set Operations",
      description: "Creating Sets and removing duplicates",
      code: `import { Set } from "@/set"

const numbers = Set([1, 2, 3, 3, 4, 4, 5]) // Duplicates removed

const withSix = numbers.add(6)
const withoutTwo = numbers.remove(2)

return withoutTwo.toArray() // [1, 3, 4, 5, 6]`,
      category: "basic",
    },
    {
      title: "Remove Duplicates",
      description: "Using Set to remove duplicates from arrays",
      code: `import { Set } from "@/set"

function removeDuplicates<T>(array: T[]): T[] {
  return Set(array).toArray()
}

const uniqueNumbers = removeDuplicates([1, 2, 2, 3, 3, 4])`,
      category: "basic",
    },
  ],

  Lazy: [
    {
      title: "Basic Lazy Evaluation",
      description: "Deferred computation with Lazy",
      code: `import { Lazy } from "@/lazy"

// Expensive computation that's deferred
const expensiveComputation = Lazy(() => {
  console.log("Computing...") // Only runs when accessed
  return Array.from({ length: 1000 }, (_, i) => i * i)
    .reduce((a, b) => a + b, 0)
})

// Computation hasn't run yet
const result = expensiveComputation.get() // Now it runs`,
      category: "basic",
    },
    {
      title: "Lazy Transformations",
      description: "Chaining operations with Lazy",
      code: `import { Lazy } from "@/lazy"

const lazyNumber = Lazy(() => 42)

const formatted = lazyNumber
  .map(n => n * 2)
  .map(n => \`Result: \${n}\`)

// None of the computations have run yet
return formatted.get() // "Result: 84"`,
      category: "intermediate",
    },
    {
      title: "Lazy Memoization",
      description: "Automatic caching of computed values",
      code: `import { Lazy } from "@/lazy"

let computationCount = 0

const memoized = Lazy(() => {
  computationCount++
  return Math.random() * 1000
})

const result1 = memoized.get() // Computes
const result2 = memoized.get() // Uses cached value

return result1 === result2 // true`,
      category: "intermediate",
    },
  ],
}
