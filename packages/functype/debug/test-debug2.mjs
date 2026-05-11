import { Option } from "../dist/index.mjs"
import { Do, $ } from "../dist/index.mjs"

console.log("=== Debug test 2 ===")

const result = Do(function* () {
  try {
    console.log("About to yield Option(null)")
    const x = yield Option(null) // Will throw NoneError
    console.log("Got x:", x)
    return x
  } catch (e) {
    console.log("Caught error:", e.message)
    // Recover from None with a default value
    return 42
  }
})

console.log("Result:", result)
console.log("Result.head:", result.head)
console.log("Result type:", typeof result.head)
