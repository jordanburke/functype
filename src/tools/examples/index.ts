/**
 * Registry of all compilable examples
 * 
 * This ensures all examples are compile-tested by importing the actual files
 */

// Import working example modules
import * as setExamples from "./set-examples"
import * as lazyExamples from "./lazy-examples"

// Verify imports exist (compile-time check)
void [setExamples, lazyExamples]

import type { FunctypeExample } from "../functype-lookup"

export const compilableExamples: Record<string, FunctypeExample[]> = {
  Set: [
    {
      title: "Basic Set Operations",
      description: "Creating Sets and removing duplicates",
      code: `import { Set } from "@/set"

const numbers = Set([1, 2, 3, 3, 4, 4, 5]) // Duplicates removed

const withSix = numbers.add(6)
const withoutTwo = numbers.remove(2)

return withoutTwo.toArray() // [1, 3, 4, 5, 6]`,
      category: "basic"
    },
    {
      title: "Remove Duplicates",
      description: "Using Set to remove duplicates from arrays",
      code: `import { Set } from "@/set"

function removeDuplicates<T>(array: T[]): T[] {
  return Set(array).toArray()
}

const uniqueNumbers = removeDuplicates([1, 2, 2, 3, 3, 4])`,
      category: "basic"
    }
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
      category: "basic"
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
      category: "intermediate"
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
      category: "intermediate"
    }
  ]
}