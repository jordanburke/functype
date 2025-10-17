/**
 * Compilable examples for Lazy data structure
 */

import { Lazy } from "@/lazy"

// Basic Lazy Evaluation
export function basicLazyUsage() {
  // Expensive computation that's deferred
  const expensiveComputation = Lazy(() => {
    console.log("Computing...") // Only runs when accessed
    return Array.from({ length: 1000000 }, (_, i) => i * i).reduce((a, b) => a + b, 0)
  })

  // Computation hasn't run yet
  console.log("Lazy created")

  // Now it runs
  const result = expensiveComputation.getOrThrow()

  // Subsequent calls return cached result
  const result2 = expensiveComputation.getOrThrow() // No recomputation

  return result === result2 // true
}

// Lazy with Transformations
export function lazyTransformations() {
  const lazyNumber = Lazy(() => 42)

  const doubled = lazyNumber.map((n) => n * 2)
  const formatted = doubled.map((n) => `Result: ${n}`)

  // None of the computations have run yet
  return formatted.getOrThrow() // "Result: 84"
}

// Lazy Chain
export function lazyChain() {
  const step1 = Lazy(() => {
    console.log("Step 1")
    return 10
  })

  const step2 = step1.flatMap((n) =>
    Lazy(() => {
      console.log("Step 2")
      return n * 3
    }),
  )

  const step3 = step2.map((n) => {
    console.log("Step 3")
    return n + 5
  })

  // Nothing has executed yet
  return step3.getOrThrow() // Logs: "Step 1", "Step 2", "Step 3", returns 35
}

// Lazy for Circular Dependencies
export function circularDependencyExample() {
  // Simulate resolving circular dependencies
  const lazyA = Lazy(() => {
    console.log("Resolving A")
    return { name: "A", dependsOn: lazyB.getOrThrow() }
  })

  const lazyB = Lazy(() => {
    console.log("Resolving B")
    return { name: "B", value: 42 }
  })

  return lazyA.getOrThrow() // { name: "A", dependsOn: { name: "B", value: 42 } }
}

// Lazy Memoization
export function lazyMemoization() {
  let computationCount = 0

  const memoizedExpensive = Lazy(() => {
    computationCount++
    console.log(`Computation #${computationCount}`)
    return Math.random() * 1000
  })

  // First access
  const result1 = memoizedExpensive.getOrThrow()

  // Second access - uses cached value
  const result2 = memoizedExpensive.getOrThrow()

  return {
    result1,
    result2,
    sameValue: result1 === result2, // true
    computationCount, // 1 - only computed once
  }
}
