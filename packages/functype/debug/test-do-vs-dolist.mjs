import { Option, List } from "../dist/index.mjs"
import { Do, $ } from "../dist/index.mjs"

console.log("=== Do vs DoList: List[0] vs List[0..n] ===\n")

// Regular Do: Takes first element from each List
console.log("Regular Do (takes List[0]):")
const regularDo = Do(function* () {
  const x = yield* $(Option(1)) // Start with Option, so it's regular Do
  const y = yield* $(List([10, 20, 30])) // Takes List[0] = 10
  const z = yield* $(List([100, 200])) // Takes List[0] = 100
  return x + y + z
})
console.log("  Result:", regularDo)
console.log("  Calculation: 1 + 10 + 100 =", regularDo)
console.log()

// List Comprehension Do: Takes all elements (cartesian product)
console.log("List Comprehension Do (takes List[0..n]):")
const listDo = Do(function* () {
  const x = yield* $(List([1, 2])) // Start with List, so it's List comprehension
  const y = yield* $(List([10, 20, 30])) // Takes ALL: [10, 20, 30]
  const z = yield* $(List([100, 200])) // Takes ALL: [100, 200]
  return x + y + z
})
console.log("  Result:", listDo.toString())
console.log("  Array:", listDo.toArray())
console.log("  Length:", listDo.length, "= 2 × 3 × 2 = 12")
console.log()

// Show the difference more clearly
console.log("Summary:")
console.log("  Do with List:     List[0] only     → returns T")
console.log("  DoList with List: List[0..n] all   → returns List<T>")
