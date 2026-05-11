import { Option, List } from "../dist/index.mjs"
import { Do, $ } from "../dist/index.mjs"

console.log("=== Debug test ===")

const result = Do(function* () {
  try {
    const x = yield Option(null) // Will throw NoneError
    return x
  } catch (e) {
    // Recover from None with a default value
    return 42
  }
})

console.log("Result:", result)
console.log("Result.head:", result.head)
console.log("Result.toString():", result.toString())
