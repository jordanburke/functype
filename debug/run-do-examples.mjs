import { Option, List, Right, Left, Try } from "../dist/index.mjs"
import { Do, $ } from "../dist/index.mjs"

console.log("=== Do-notation Examples ===\n")

// Example 1: Simple Option
console.log("1. Simple Option:")
const optionResult = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
})
console.log("  Result:", optionResult.toString())
console.log()

// Example 2: List Comprehension (Cartesian Product)
console.log("2. List Comprehension (Cartesian Product):")
const listResult = Do(function* () {
  const x = yield* $(List([1, 2]))
  const y = yield* $(List([10, 20]))
  return x + y
})
console.log("  Result:", listResult.toString())
console.log("  Array:", listResult.toArray())
console.log()

// Example 3: Three-way Cartesian Product
console.log("3. Three-way Cartesian Product:")
const threeWay = Do(function* () {
  const x = yield* $(List([1, 2]))
  const y = yield* $(List([3, 4]))
  const z = yield* $(List([5, 6]))
  return x * 100 + y * 10 + z
})
console.log("  Result:", threeWay.toString())
console.log("  Array:", threeWay.toArray())
console.log("  Length:", threeWay.length, "(2 * 2 * 2 = 8)")
console.log()

// Example 4: Cartesian Product with Objects
console.log("4. Cartesian Product with Objects:")
const pairs = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List([10, 20]))
  return { x, y, product: x * y }
})
console.log("  Length:", pairs.length, "(3 * 2 = 6)")
console.log("  All pairs:")
pairs.toArray().forEach((p) => console.log(`    {x: ${p.x}, y: ${p.y}, product: ${p.product}}`))
console.log()

// Example 5: Condition inside Do (still full cartesian product)
console.log("5. Condition inside Do (still produces all combinations):")
const withCondition = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List([1, 2, 3]))

  // Condition affects the returned value, NOT the iteration
  if (x < y) {
    return { x, y, sum: x + y }
  } else {
    return { x, y, sum: 0 }
  }
})
console.log("  Total combinations:", withCondition.length, "(3 * 3 = 9)")
console.log("  All results:")
withCondition.toArray().forEach((item) => console.log(`    {x: ${item.x}, y: ${item.y}, sum: ${item.sum}}`))
console.log("  With sum > 0:", withCondition.toArray().filter((item) => item.sum > 0).length)
console.log("  With sum = 0:", withCondition.toArray().filter((item) => item.sum === 0).length)
console.log()

// Example 6: Mixed monads (first monad determines return type)
console.log("6. Mixed Monads:")

// When Option comes first, result is Option
const optionFirst = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(List([1, 2, 3])) // Only first element used
  return x + y
})
console.log("  Option first:", optionFirst.toString(), "(Option, not List)")

// When List comes first, result is List
const listFirst = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(Option(10))
  return x + y
})
console.log("  List first:", listFirst.toString())
console.log("  List first array:", listFirst.toArray())
