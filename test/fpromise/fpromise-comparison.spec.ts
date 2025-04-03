import { describe, expect, it } from "vitest"

import { type ErrorContext, FPromise } from "@/fpromise/FPromise" // Assuming FPromise and ErrorContext are exported

// --- Custom Error Types for Demonstration ---
class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NetworkError"
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message)
    this.name = "ValidationError"
  }
}

class UnexpectedError extends Error {
  constructor(
    message: string,
    public originalError?: unknown,
  ) {
    super(message)
    this.name = "UnexpectedError"
  }
}

// --- Helper Functions ---

// Helper function for basic performance measurement
const measureTime = async (label: string, iterations: number, fn: () => Promise<unknown>): Promise<number> => {
  // Run multiple times to get a more stable average, discarding first run (warm-up)
  const runs = 3
  let totalDuration = 0
  await fn() // Warm-up run

  for (let r = 0; r < runs; r++) {
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      // We only await the final result in a real scenario,
      // but for benchmarking the loop itself, we don't await each one
      // This focuses on the overhead of creating/chaining the promises/fpromises
      await fn()
    }
    // Await one final time to ensure microtasks resolve before ending timer
    await fn()
    const end = performance.now()
    totalDuration += end - start
  }

  const avgDuration = totalDuration / runs
  console.log(`${label} (${iterations} iterations, avg over ${runs} runs): ${avgDuration.toFixed(2)} ms`)
  return avgDuration
}

// Helper async function that returns a Promise/FPromise (for flatMap tests)
const asyncOperation = async (value: number): Promise<string> => {
  return Promise.resolve(`Processed: ${value}`)
}

const asyncFpOperation = (value: number): FPromise<string, Error> => {
  return FPromise.from(Promise.resolve(`Processed: ${value}`))
}

// Helper function that might fail with different errors
const operationThatMightFail = (type: "network" | "validation" | "other" | "success"): Promise<string> => {
  if (type === "network") {
    return Promise.reject(new NetworkError("Connection timed out"))
  } else if (type === "validation") {
    return Promise.reject(new ValidationError("Invalid input", "email"))
  } else if (type === "other") {
    return Promise.reject(new Error("Something unexpected happened"))
  } else {
    return Promise.resolve("Operation successful")
  }
}

const fpOperationThatMightFail = (type: "network" | "validation" | "other" | "success"): FPromise<string, Error> => {
  // Optimized: Directly create rejected/resolved FPromise
  if (type === "network") {
    return FPromise.reject(new NetworkError("Connection timed out"))
  } else if (type === "validation") {
    return FPromise.reject(new ValidationError("Invalid input", "email"))
  } else if (type === "other") {
    return FPromise.reject(new Error("Something unexpected happened"))
  } else {
    return FPromise.resolve("Operation successful")
  }
}

describe("Promise vs FPromise Comparison", () => {
  // --- Map Comparison ---
  it("should demonstrate usability differences with map/then (synchronous mapping)", async () => {
    // ... (previous test code) ...
    const initialValue = 42
    const nativePromiseMapResult = await Promise.resolve(initialValue)
      .then((v) => v * 2)
      .then((v) => v + 10)
      .then((v) => `Result: ${v}`)
    expect(nativePromiseMapResult).toBe("Result: 94")
    const fPromiseMapResult = await FPromise.resolve(initialValue)
      .map((v) => v * 2)
      .map((v) => v + 10)
      .map((v) => `Result: ${v}`)
      .toPromise()
    expect(fPromiseMapResult).toBe("Result: 94")
  })

  // --- FlatMap Comparison ---
  it("should demonstrate usability differences with flatMap/then (asynchronous chaining)", async () => {
    // ... (previous test code) ...
    const initialValue = 100
    const nativePromiseFlatMapResult = await Promise.resolve(initialValue)
      .then(asyncOperation)
      .then((res) => res.toUpperCase())
    expect(nativePromiseFlatMapResult).toBe("PROCESSED: 100")
    const fPromiseFlatMapResult = await FPromise.resolve(initialValue)
      .flatMap(asyncFpOperation)
      .map((res) => res.toUpperCase())
      .toPromise()
    expect(fPromiseFlatMapResult).toBe("PROCESSED: 100")
  })

  // --- Error Handling Comparison ---
  describe("Error Handling Comparison", () => {
    it("Native Promise: requires manual checks in .catch", async () => {
      // ... (previous test code for usability) ...
      const result = await operationThatMightFail("validation")
        .then((res) => `Success: ${res}`)
        .catch((error) => {
          if (error instanceof ValidationError) {
            return `Handled Validation Error: ${error.message} on field ${error.field}`
          } else if (error instanceof NetworkError) {
            return `Handled Network Error: ${error.message}`
          } else {
            return `Caught unexpected error: ${error instanceof Error ? error.message : "Unknown"}`
          }
        })
      expect(result).toBe("Handled Validation Error: Invalid input on field email")
    })

    it("FPromise: uses filterError for selective handling", async () => {
      // ... (previous test code for usability) ...
      const handleValidationOnly = (type: "network" | "validation" | "other" | "success") =>
        fpOperationThatMightFail(type)
          .filterError(
            (e): e is ValidationError => e instanceof ValidationError,
            (valError: ValidationError) => FPromise.resolve(`Recovered from Validation Error: ${valError.field}`),
          )
          .toPromise()
      expect(await handleValidationOnly("validation")).toBe("Recovered from Validation Error: email")
      await expect(handleValidationOnly("network")).rejects.toThrow(NetworkError)
    })

    it("FPromise: uses mapError to transform any error", async () => {
      // ... (previous test code for usability) ...
      const transformAllErrors = (type: "network" | "validation" | "other" | "success") =>
        fpOperationThatMightFail(type)
          .mapError(
            (originalError: Error, _context: ErrorContext) =>
              new UnexpectedError(`Transformed from ${originalError.name}`, originalError),
          )
          .toPromise()
      await expect(transformAllErrors("validation")).rejects.toThrow(UnexpectedError)
    })

    it("FPromise: uses recoverWith to provide a default value", async () => {
      // ... (previous test code for usability) ...
      const recoverFromAny = (type: "network" | "validation" | "other" | "success") =>
        fpOperationThatMightFail(type)
          .recoverWith((error: Error) => `Recovered from ${error.name || "Error"}`)
          .toPromise()
      expect(await recoverFromAny("validation")).toBe("Recovered from ValidationError")
    })

    // --- NEW: Error Handling Performance Test ---
    it("should compare performance of error recovery", async () => {
      const iterations = 10000
      const recoveryValue = "Recovered"

      // 1. Native Promise with .catch and instanceof
      const nativeCatchFn = () =>
        operationThatMightFail("validation") // Always fail with validation error
          .catch((error) => {
            if (error instanceof ValidationError) {
              return recoveryValue // Recover
            }
            // In a real scenario might handle other errors or re-throw
            return "Different Error"
          })

      const nativeTime = await measureTime("Native Promise .catch + instanceof", iterations, nativeCatchFn)
      expect(await nativeCatchFn()).toBe(recoveryValue)

      // 2. FPromise with .filterError + recovery (more steps involved)
      const fpromiseFilterFn = () =>
        fpOperationThatMightFail("validation") // Always fail
          .filterError(
            (e): e is ValidationError => e instanceof ValidationError,
            () => FPromise.resolve(recoveryValue), // Recovery handler
          )
          // If filter didn't match (won't happen here), it would reject. Add a final catch/recover for fair comparison.
          .recoverWith(() => "Different Error")
          .toPromise()

      const filterTime = await measureTime("FPromise .filterError + recover", iterations, fpromiseFilterFn)
      expect(await fpromiseFilterFn()).toBe(recoveryValue)

      // 3. FPromise with .recoverWith (simplest FPromise recovery)
      const fpromiseRecoverFn = () =>
        fpOperationThatMightFail("validation") // Always fail
          .recoverWith((error) => {
            // Could add instanceof check here if needed, but recoverWith handles any error
            if (error instanceof ValidationError) {
              return recoveryValue // Recover
            }
            return "Different Error"
          })
          .toPromise()

      const recoverTime = await measureTime("FPromise .recoverWith", iterations, fpromiseRecoverFn)
      expect(await fpromiseRecoverFn()).toBe(recoveryValue)

      console.log(`Error Handling Perf Ratio (Native / filterError): ${(nativeTime / filterTime).toFixed(2)}`)
      console.log(`Error Handling Perf Ratio (Native / recoverWith): ${(nativeTime / recoverTime).toFixed(2)}`)

      // Notes: Expect native .catch to be fastest.
      // .recoverWith is likely faster than .filterError as it's simpler internally.
      // .filterError involves predicate checks and potentially creating intermediate promises.
    })
  })

  // --- Performance Comparison (Map/FlatMap) ---
  it("should perform a basic performance comparison for chained synchronous maps", async () => {
    // ... (previous test code) ...
    const iterations = 10000
    const initialValue = 1
    const nativePromiseMapFn = () =>
      Promise.resolve(initialValue)
        .then((v) => v + 1)
        .then((v) => v + 1)
        .then((v) => v + 1)
    const nativeMapTime = await measureTime("Native Promise (Sync Map)", iterations, nativePromiseMapFn)
    expect(await nativePromiseMapFn()).toBe(4)
    const fPromiseMapFn = () =>
      FPromise.resolve(initialValue)
        .map((v) => v + 1)
        .map((v) => v + 1)
        .map((v) => v + 1)
        .toPromise()
    const fPromiseMapTime = await measureTime("FPromise (Sync Map)", iterations, fPromiseMapFn)
    expect(await fPromiseMapFn()).toBe(4)
    console.log(`Sync Map Perf Ratio (Native / FPromise): ${(nativeMapTime / fPromiseMapTime).toFixed(2)}`)
  })

  it("should perform a basic performance comparison for chained asynchronous flatMaps", async () => {
    // ... (previous test code) ...
    const iterations = 200
    const initialValue = 1
    const nativePromiseFlatMapFn = () =>
      Promise.resolve(initialValue)
        .then(asyncOperation)
        .then(() => asyncOperation(2))
        .then(() => asyncOperation(3))
    const nativeFlatMapTime = await measureTime("Native Promise (Async Chain)", iterations, nativePromiseFlatMapFn)
    expect(await nativePromiseFlatMapFn()).toBe("Processed: 3")
    const fPromiseFlatMapFn = () =>
      FPromise.resolve(initialValue)
        .flatMap(asyncFpOperation)
        .flatMap(() => asyncFpOperation(2))
        .flatMap(() => asyncFpOperation(3))
        .toPromise()
    const fPromiseFlatMapTime = await measureTime("FPromise (Async Chain)", iterations, fPromiseFlatMapFn)
    expect(await fPromiseFlatMapFn()).toBe("Processed: 3")
    console.log(`Async Chain Perf Ratio (Native / FPromise): ${(nativeFlatMapTime / fPromiseFlatMapTime).toFixed(2)}`)
  })
})
