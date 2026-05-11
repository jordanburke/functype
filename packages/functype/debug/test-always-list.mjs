import { Option, List, Right } from "../dist/index.mjs"
import { Do, $ } from "../dist/index.mjs"

console.log("=== What if Do ALWAYS returned List? ===\n")

// Currently: Do with Option returns unwrapped value
console.log("Current behavior (Option only):")
const current = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
})
console.log("  Type:", typeof current)
console.log("  Value:", current)
console.log()

// Proposed: Do ALWAYS returns List
console.log("Proposed behavior (Option only → List with 1 element):")
console.log("  Would return: List([15])")
console.log("  To get value: result.head or result.get(0)")
console.log()

// With Lists - already returns List
console.log("With Lists (no change):")
const withLists = Do(function* () {
  const x = yield* $(List([1, 2]))
  const y = yield* $(List([10, 20]))
  return x + y
})
console.log("  Returns:", withLists.toString())
console.log()

// Mixed types would be clearer
console.log("Mixed types (Option + List):")
console.log("Current confusing behavior:")
console.log("  - Option first → returns number")
console.log("  - List first → returns List<number>")
console.log()
console.log("Proposed consistent behavior:")
console.log("  - Always returns List<number>")
console.log("  - Option contributes 1 value")
console.log("  - List contributes n values")
console.log()

// API would be:
console.log("Proposed API:")
console.log("  const result = Do(function* { ... })  // Always returns List<T>")
console.log("  ")
console.log("  // If you expect single value:")
console.log("  const value = result.head             // T | undefined")
console.log("  const value = result.headOption       // Option<T>")
console.log("  const value = result.get(0)           // Option<T>")
console.log("  ")
console.log("  // If you expect multiple values:")
console.log("  const values = result.toArray()       // T[]")
console.log("  result.forEach(v => ...)              // iterate")
console.log()

console.log("Benefits:")
console.log("  ✓ Consistent behavior - always List")
console.log("  ✓ Predictable types - Do<T> returns List<T>")
console.log("  ✓ No confusion about List[0] vs List[0..n]")
console.log("  ✓ Explicit when you want single value (.head)")
console.log("  ✓ Matches FP expectations (like Scala collections)")
console.log()

console.log("Drawbacks:")
console.log("  - Extra .head for simple Option/Either chains")
console.log("  - Might be surprising at first")
console.log("  - Single-element Lists have overhead")
