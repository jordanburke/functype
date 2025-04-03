import { describe, expect, it } from "vitest"
import { FPromise } from "@/fpromise/FPromise" // Assuming FPromise is exported from here [cite: 358]

// Helper function for basic performance measurement
const measureTime = async (label: string, iterations: number, fn: () => Promise<unknown>): Promise<number> => {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await fn();
  }
  const end = performance.now();
  const duration = end - start;
  console.log(`${label} (${iterations} iterations): ${duration.toFixed(2)} ms`);
  return duration;
};

describe("Promise vs FPromise Comparison", () => {

  it("should demonstrate usability differences with map/then", async () => {
    const initialValue = 42;

    // --- Native Promise ---
    // Chaining synchronous maps with native Promises requires nesting or more complex async/await structures
    const nativePromiseResult = await Promise.resolve(initialValue)
      .then((value) => value * 2) // Synchronous transformation
      .then((value) => value + 10) // Another synchronous transformation
      .then((value) => `Result: ${value}`); // Final transformation

    expect(nativePromiseResult).toBe("Result: 94");

    // --- FPromise ---
    // FPromise.map allows direct chaining of synchronous transformations [cite: 260, 261]
    const fPromiseResult = await FPromise.resolve(initialValue)
      .map((value) => value * 2) // Synchronous transformation
      .map((value) => value + 10) // Another synchronous transformation
      .map((value) => `Result: ${value}`) // Final transformation
      .toPromise(); // Convert back to native promise for awaiting [cite: 315]

    expect(fPromiseResult).toBe("Result: 94");

    // --- Comparison ---
    // FPromise's map provides a more straightforward way to chain synchronous
    // transformations compared to the standard Promise.then, which is primarily
    // designed for asynchronous operations. While Promise.then *can* handle
    // synchronous returns, FPromise.map makes the intent clearer for functional-style
    // synchronous data transformation within an asynchronous context.
  });

  it("should perform a basic performance comparison for chained maps", async () => {
    const iterations = 10000; // Number of times to run the chain
    const initialValue = 1;

    // --- Native Promise Performance ---
    const nativePromiseFn = () =>
      Promise.resolve(initialValue)
        .then((v) => v + 1)
        .then((v) => v + 1)
        .then((v) => v + 1);

    const nativeTime = await measureTime("Native Promise", iterations, nativePromiseFn);
    const nativeResult = await nativePromiseFn(); // Run once to check result
    expect(nativeResult).toBe(4);

    // --- FPromise Performance ---
    const fPromiseFn = () =>
      FPromise.resolve(initialValue)
        .map((v) => v + 1)
        .map((v) => v + 1)
        .map((v) => v + 1)
        .toPromise(); // Convert for await

    const fPromiseTime = await measureTime("FPromise", iterations, fPromiseFn);
    const fPromiseResult = await fPromiseFn(); // Run once to check result
    expect(fPromiseResult).toBe(4);

    // --- Performance Notes ---
    // This micro-benchmark compares the overhead of chaining simple synchronous
    // transformations. FPromise introduces its own wrapper and methods[cite: 258, 321],
    // which might add some overhead compared to the highly optimized native Promise.
    // However, real-world performance depends heavily on the complexity of the
    // operations, the mix of sync/async tasks, and the specific JavaScript engine.
    // The usability benefits of FPromise might outweigh minor performance differences
    // in many scenarios, especially when complex error handling [cite: 248, 249, 250] or
    // functional patterns are desired.
    console.log(`Performance Ratio (Native / FPromise): ${(nativeTime / fPromiseTime).toFixed(2)}`);
    // Expect FPromise might be slightly slower due to the wrapper overhead,
    // but this can vary greatly depending on the environment and workload.
    // expect(fPromiseTime).toBeGreaterThan(nativeTime * 0.8); // Example assertion: FPromise isn't drastically slower
  });
});