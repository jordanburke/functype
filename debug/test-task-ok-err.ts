import { Task, Ok, Err, type TaskOutcome } from "../src"

async function testOkErr() {
  console.log("Testing Ok/Err pattern...")

  // Test 1: Explicit Ok return
  const result1 = await Task().Async(async (): Promise<TaskOutcome<string>> => {
    return Ok("success")
  })

  console.log("Test 1 - Explicit Ok:", result1.isSuccess() ? result1.value : "failed")

  // Test 2: Explicit Err return
  const result2 = await Task().Async(async (): Promise<TaskOutcome<string>> => {
    return Err<string>("error occurred")
  })

  console.log("Test 2 - Explicit Err:", result2.isFailure() ? result2.error.message : "unexpected success")

  // Test 3: Raw value (should auto-wrap as Ok)
  const result3 = await Task().Async(async () => {
    return "raw value"
  })

  console.log("Test 3 - Raw value:", result3.isSuccess() ? result3.value : "failed")

  // Test 4: Thrown error (should auto-wrap as Err)
  const result4 = await Task().Async(async () => {
    throw new Error("thrown error")
  })

  console.log("Test 4 - Thrown error:", result4.isFailure() ? result4.error.message : "unexpected success")

  // Test 5: Error handler returning Ok (recovery)
  const result5 = await Task().Async(
    async () => {
      throw new Error("initial error")
    },
    async (error) => {
      // Recover by returning Ok
      return Ok("recovered")
    },
  )

  console.log("Test 5 - Recovery with Ok:", result5.isSuccess() ? result5.value : "failed")

  console.log("All tests completed!")
}

testOkErr().catch(console.error)
