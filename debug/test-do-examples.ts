#!/usr/bin/env npx tsx

import {
  optionExample,
  eitherExample,
  listComprehensionExample,
  mixedMonadsExample,
  errorRecoveryExample,
  cartesianWithConditionExample,
  pythagoreanTriplesAttempt,
  userValidationExample,
  nestedDoExample,
  customMonadExample,
} from "../src/do/examples"

console.log("=== Do-notation Examples ===\n")

// Example 1: Option
console.log("1. Option Example:")
const optionResult = optionExample()
console.log("  Traditional:", optionResult.traditional.toString())
console.log("  With assertions:", optionResult.withAssertions.toString())
console.log("  With $:", optionResult.withDollar.toString())
console.log()

// Example 2: Either
console.log("2. Either Example:")
console.log("  Valid user (id=1):", eitherExample(1).toString())
console.log("  Invalid user (id=-1):", eitherExample(-1).toString())
console.log()

// Example 3: List Comprehensions
console.log("3. List Comprehension Example:")
const listResult = listComprehensionExample()
console.log("  Traditional:", listResult.traditional.toArray())
console.log("  With Do:", listResult.withDo.toArray())
console.log("  Three-way:", listResult.threeWay.toArray())
console.log("  Pairs (first 3):", listResult.pairs.toArray().slice(0, 3))
console.log("  Pairs total count:", listResult.pairs.length)
console.log()

// Example 4: Mixed Monads
console.log("4. Mixed Monads Example:")
try {
  const mixedValid = mixedMonadsExample({ userId: 42, multiplier: 2 })
  console.log("  Valid data:", mixedValid.toString())
} catch (e) {
  console.log("  Valid data failed:", e.message)
}
try {
  const mixedInvalid = mixedMonadsExample({ multiplier: 0 })
  console.log("  Invalid data:", mixedInvalid.toString())
} catch (e) {
  console.log("  Invalid data failed:", e.message)
}
console.log()

// Example 5: Error Recovery
console.log("5. Error Recovery Example:")
const errorResult = errorRecoveryExample()
console.log("  Result:", errorResult.toString())
console.log()

// Example 7: Cartesian with Condition
console.log("7. Cartesian Product with Condition:")
const cartesianResult = cartesianWithConditionExample()
const cartesianArray = cartesianResult.toArray()
console.log("  Total combinations:", cartesianArray.length)
console.log("  First 5:", cartesianArray.slice(0, 5))
console.log("  With sum > 0:", cartesianArray.filter((item) => item.sum > 0).length)
console.log("  With sum = 0:", cartesianArray.filter((item) => item.sum === 0).length)
console.log()

// Example 7b: Pythagorean Triples
console.log("7b. Pythagorean Triples (Cartesian Product):")
const pythagoreanResult = pythagoreanTriplesAttempt()
const pythagoreanArray = pythagoreanResult.toArray()
console.log("  Total combinations checked:", pythagoreanArray.length)
const validTriples = pythagoreanArray.filter((t) => t.valid)
console.log("  Valid Pythagorean triples:", validTriples)
console.log("  Count of valid triples:", validTriples.length)
console.log()

// Example 8: User Validation
console.log("8. User Validation Example:")
const validUser = userValidationExample({
  email: "alice@example.com",
  age: 25,
  country: "US",
})
console.log("  Valid user:", validUser.toString())

const invalidEmail = userValidationExample({
  email: "not-an-email",
  age: 25,
  country: "US",
})
console.log("  Invalid email:", invalidEmail.toString())
console.log()

// Example 9: Nested Do
console.log("9. Nested Do Example:")
const nestedResult = nestedDoExample()
console.log("  Result:", nestedResult.toString())
console.log()

// Example 10: Custom Monad
console.log("10. Custom Monad Example:")
const customResult = customMonadExample()
console.log("  Result:", customResult.toString())
