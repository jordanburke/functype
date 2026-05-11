import { Option, List, Right } from "../dist/index.mjs"
import { Do, $ } from "../dist/index.mjs"

console.log("=== Why would you want List[0] behavior? ===\n")

// Use case 1: When you actually just want the first element
console.log("Use case 1: Getting the head of a List in a chain")
const result1 = Do(function* () {
  const user = yield* $(Option({ name: "Alice", scores: [95, 87, 92] }))
  const firstScore = yield* $(List(user.scores)) // Just want the first score
  return `${user.name}'s first score: ${firstScore}`
})
console.log("  Result:", result1)
console.log()

// But wait... this is weird! Why not just use:
console.log("  Better alternative:")
const result1b = Do(function* () {
  const user = yield* $(Option({ name: "Alice", scores: [95, 87, 92] }))
  const firstScore = yield* $(List(user.scores).headOption) // More explicit!
  return `${user.name}'s first score: ${firstScore}`
})
console.log("  Result:", result1b)
console.log()

// Use case 2: Mixing types where you DON'T want cartesian product
console.log("Use case 2: When you DON'T want cartesian explosion")
console.log("  Imagine: 3 Lists of 100 items each")
console.log("  - With List[0]: processes 1 result")
console.log("  - With List[0..n]: processes 100×100×100 = 1,000,000 results!")
console.log()

// The real question: Is taking List[0] ever the RIGHT semantic?
console.log("The semantic question:")
console.log("  If List represents multiple possibilities/values...")
console.log("  Why would Do-notation only process the first one?")
console.log("  That seems to violate the concept of List as a monad!")
console.log()

// In Scala for-comprehensions, Lists ALWAYS do cartesian product
console.log("Scala for-comprehension (always cartesian):")
console.log("  for {")
console.log("    x <- List(1, 2)")
console.log("    y <- List(10, 20)")
console.log("  } yield x + y")
console.log("  // Result: List(11, 21, 12, 22)")
console.log()

console.log("Conclusion: Taking List[0] seems wrong!")
console.log("  - It's not what users expect")
console.log("  - It's not how other languages work")
console.log("  - It breaks the List monad semantics")
