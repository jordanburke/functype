import { Lazy } from "@/lazy"
import { Option } from "@/option"

console.log("=== Lazy Evaluation Examples ===\n")

// Example 1: Basic lazy evaluation
console.log("1. Basic lazy evaluation:")
const expensive = Lazy(() => {
  console.log("  Computing expensive value...")
  return 42
})
console.log("  Lazy created (not evaluated yet)")
console.log("  First get:", expensive.get())
console.log("  Second get:", expensive.get(), "(cached, no recomputation)")

// Example 2: Error handling
console.log("\n2. Error handling:")
const risky = Lazy(() => {
  if (Math.random() > 0.5) {
    throw new Error("Random failure!")
  }
  return "Success"
})

console.log("  Safe access with getOrElse:", risky.getOrElse("Default"))
console.log("  Convert to Option:", risky.toOption())
console.log("  Convert to Either:", risky.toEither())

// Example 3: Chaining computations
console.log("\n3. Chaining computations:")
const result = Lazy(() => 10)
  .map((x) => {
    console.log(`  Mapping: ${x} * 2`)
    return x * 2
  })
  .flatMap((x) =>
    Lazy(() => {
      console.log(`  FlatMapping: ${x} + 5`)
      return x + 5
    }),
  )
  .recover((err) => {
    console.log("  Recovering from error")
    return 0
  })

console.log("  Final result:", result.get())

// Example 4: Integration with functype
console.log("\n4. Integration with Option:")
const userOption: Option<{ id: number; name: string }> = Option({ id: 1, name: "Alice" })
const fallbackUser = () => ({ id: 0, name: "Anonymous" })

const userName = Lazy.fromOption(userOption, fallbackUser)
  .map((user) => user.name)
  .map((name) => name.toUpperCase())

console.log("  User name:", userName.get())

// Example 5: Lazy filtering
console.log("\n5. Lazy filtering:")
const filtered = Lazy(() => 42)
  .filter((x) => x > 40)
  .map((opt) => opt.getOrElse(0))

console.log("  Filtered value:", filtered.get())

// Example 6: Error recovery patterns
console.log("\n6. Error recovery patterns:")
const computation = Lazy<number>(() => {
  throw new Error("Initial failure")
})
  .recover((err) => {
    console.log("  First recovery:", err instanceof Error ? err.message : String(err))
    return 100
  })
  .map((x) => x * 2)

console.log("  Recovered value:", computation.get())

// Example 7: Lazy side effects
console.log("\n7. Side effects with tap:")
const withEffects = Lazy(() => 42)
  .tap((value) => console.log("  Side effect - value is:", value))
  .map((x) => x + 1)
  .tapError((err) => console.log("  Side effect - error:", err))

console.log("  Final value:", withEffects.get())

// Example 8: Pattern matching
console.log("\n8. Pattern matching:")
const matched = Lazy(() => "Hello").match({
  Lazy: (value) => `Matched: ${value}!`,
})

console.log("  Match result:", matched)

console.log("\n=== End of Examples ===")
