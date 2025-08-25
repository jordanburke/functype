import { Option, List, Right, Left } from "../dist/index.mjs"
import { Do, $ } from "../dist/index.mjs"

console.log("=== Testing Mixed Types in List Comprehensions ===\n")

// Test 1: List + Option
console.log("1. List + Option:")
try {
  const mixed1 = Do(function* () {
    const x = yield* $(List([1, 2, 3])) // List
    const y = yield* $(Option(10)) // Option
    return x + y
  })
  console.log("  Result:", mixed1.toString())
  console.log("  Type:", mixed1.constructor.name)
  console.log("  Is List?", "toArray" in mixed1)
  if ("toArray" in mixed1) {
    console.log("  Array:", mixed1.toArray())
  }
} catch (e) {
  console.log("  Error:", e.message)
}
console.log()

// Test 2: Option + List (reversed order)
console.log("2. Option + List (reversed order):")
try {
  const mixed2 = Do(function* () {
    const x = yield* $(Option(5)) // Option first
    const y = yield* $(List([10, 20])) // List second
    return x + y
  })
  console.log("  Result:", mixed2.toString())
  console.log("  Type:", typeof mixed2)
  console.log("  Value:", mixed2)
} catch (e) {
  console.log("  Error:", e.message)
}
console.log()

// Test 3: List + Either
console.log("3. List + Either:")
try {
  const mixed3 = Do(function* () {
    const x = yield* $(List([1, 2]))
    const y = yield* $(Right(100))
    return { x, y, sum: x + y }
  })
  console.log("  Result:", mixed3.toString())
  if ("toArray" in mixed3) {
    console.log("  Array:", mixed3.toArray())
  }
} catch (e) {
  console.log("  Error:", e.message)
}
console.log()

// Test 4: List + Either with Left (should fail)
console.log("4. List + Either with Left (should fail):")
try {
  const mixed4 = Do(function* () {
    const x = yield* $(List([1, 2]))
    const y = yield* $(Left("error")) // This should cause failure
    return x + y
  })
  console.log("  Result:", mixed4.toString())
} catch (e) {
  console.log("  Error:", e.message)
}
console.log()

// Test 5: Multiple Lists + Option
console.log("5. Multiple Lists + Option:")
try {
  const mixed5 = Do(function* () {
    const a = yield* $(List([1, 2]))
    const b = yield* $(Option(10))
    const c = yield* $(List([100, 200]))
    return a + b + c
  })
  console.log("  Result:", mixed5.toString())
  if ("toArray" in mixed5) {
    console.log("  Array:", mixed5.toArray())
    console.log("  Length:", mixed5.length, "(should be 2*1*2 = 4)")
  }
} catch (e) {
  console.log("  Error:", e.message)
}
