import { Option, List, Right, Left } from "../dist/index.mjs"
import { Do, $ } from "../dist/index.mjs"

console.log("=== Testing New Do: Always Returns List ===\n")

// Test 1: Simple Option chain
console.log("1. Simple Option chain (now returns List):")
const optionResult = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
})
console.log("  Result:", optionResult.toString())
console.log("  Type:", optionResult.constructor.name)
console.log("  Head:", optionResult.head)
console.log("  HeadOption:", optionResult.headOption.toString())
console.log()

// Test 2: List comprehension (unchanged behavior)
console.log("2. List comprehension:")
const listResult = Do(function* () {
  const x = yield* $(List([1, 2]))
  const y = yield* $(List([10, 20]))
  return x + y
})
console.log("  Result:", listResult.toString())
console.log("  Array:", listResult.toArray())
console.log()

// Test 3: Mixed types (Option + List)
console.log("3. Mixed types (Option + List):")
const mixed = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(List([10, 20, 30]))
  return x + y
})
console.log("  Result:", mixed.toString())
console.log("  Array:", mixed.toArray())
console.log("  Length:", mixed.length, "(1 × 3 = 3)")
console.log()

// Test 4: Either chain
console.log("4. Either chain (now returns List):")
const eitherResult = Do(function* () {
  const x = yield* $(Right(100))
  const y = yield* $(Right(200))
  return { sum: x + y }
})
console.log("  Result:", eitherResult.toString())
console.log("  Head:", JSON.stringify(eitherResult.head))
console.log()

// Test 5: Error handling still works
console.log("5. Error handling with Left:")
try {
  const errorResult = Do(function* () {
    const x = yield* $(Right(100))
    const y = yield* $(Left("Error!"))
    return x + y
  })
  console.log("  Result:", errorResult.toString())
} catch (e) {
  console.log("  Caught error:", e.message)
}
console.log()

// Test 6: Empty List still throws
console.log("6. Empty List behavior:")
try {
  const emptyResult = Do(function* () {
    const x = yield* $(Option(5))
    const y = yield* $(List([]))
    return x + y
  })
  console.log("  Result:", emptyResult.toString())
} catch (e) {
  console.log("  Caught error:", e.message)
}
console.log()

console.log("Summary of new behavior:")
console.log("  - Do ALWAYS returns List<T>")
console.log("  - Single-value monads create List with 1 element")
console.log("  - Lists create cartesian products")
console.log("  - Use .head or .headOption to get single values")
console.log("  - Consistent and predictable!")
