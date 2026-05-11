import { Option, List, Right } from "../dist/index.mjs"
import { Do, $ } from "../dist/index.mjs"

console.log("=== How Lists work in regular Do (non-List comprehension) ===\n")

// Test 1: Option first, then List
console.log("1. Option first, then List:")
try {
  const result1 = Do(function* () {
    const x = yield* $(Option(5)) // Option first - so NOT a List comprehension
    const y = yield* $(List([10, 20, 30])) // What happens with this List?
    return x + y
  })
  console.log("  Result:", result1)
  console.log("  Type:", typeof result1)
  console.log("  Is this a List?", result1 && typeof result1 === "object" && "toArray" in result1)
} catch (e) {
  console.log("  Error:", e.message)
}
console.log()

// Test 2: Either first, then List
console.log("2. Either first, then List:")
try {
  const result2 = Do(function* () {
    const x = yield* $(Right(100)) // Either first
    const y = yield* $(List([1, 2, 3])) // List second
    const z = yield* $(Option(10)) // Option third
    return { x, y, z, sum: x + y + z }
  })
  console.log("  Result:", JSON.stringify(result2))
  console.log("  Type:", typeof result2)
} catch (e) {
  console.log("  Error:", e.message)
}
console.log()

// Test 3: Option, then empty List (should fail?)
console.log("3. Option first, then empty List:")
try {
  const result3 = Do(function* () {
    const x = yield* $(Option(5))
    const y = yield* $(List([])) // Empty list
    return x + y
  })
  console.log("  Result:", result3)
} catch (e) {
  console.log("  Error:", e.message)
}
console.log()

// Test 4: Let's trace exactly what List returns in regular Do
console.log("4. Tracing List behavior in regular Do:")
try {
  const result4 = Do(function* () {
    console.log("  Yielding Option(42)...")
    const a = yield* $(Option(42))
    console.log("  Got from Option:", a)

    console.log("  Yielding List([100, 200, 300])...")
    const b = yield* $(List([100, 200, 300]))
    console.log("  Got from List:", b)

    return a + b
  })
  console.log("  Final result:", result4)
} catch (e) {
  console.log("  Error:", e.message)
}
console.log()

// Test 5: What about multiple Lists in regular Do?
console.log("5. Multiple Lists in regular Do:")
try {
  const result5 = Do(function* () {
    const x = yield* $(Option(1)) // Option first - so NOT List comprehension
    const y = yield* $(List([10, 20])) // First List
    const z = yield* $(List([100, 200])) // Second List
    return x + y + z
  })
  console.log("  Result:", result5)
  console.log("  Type:", typeof result5)
} catch (e) {
  console.log("  Error:", e.message)
}
