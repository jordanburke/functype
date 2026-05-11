import { describe, expect, it } from "vitest"

import { Companion } from "@/companion/Companion"

describe("Companion", () => {
  it("should create a companion object with methods", () => {
    const companions = Companion(
      {
        greet: () => "Hello",
        farewell: () => "Goodbye",
      },
      {},
    )

    expect(companions.greet()).toBe("Hello")
    expect(companions.farewell()).toBe("Goodbye")
  })

  it("should handle complex return values", () => {
    const companions = Companion(
      {
        getUser: () => ({ name: "John", age: 30 }),
        getNumbers: () => [1, 2, 3, 4, 5],
      },
      {},
    )

    expect(companions.getUser()).toEqual({ name: "John", age: 30 })
    expect(companions.getNumbers()).toEqual([1, 2, 3, 4, 5])
  })

  it("should maintain proper this context", () => {
    type State = { counter: number }

    // Create state object
    const state: State = { counter: 0 }

    // Create companions with state as context
    const companions = Companion(
      {
        getCounter: function (this: State) {
          return this.counter
        },
        increment: function (this: State) {
          this.counter += 1
          return this.counter
        },
      },
      state,
    )

    expect(companions.getCounter()).toBe(0)
    expect(companions.increment()).toBe(1)
    expect(companions.increment()).toBe(2)
    expect(companions.getCounter()).toBe(2)
  })

  it("should handle methods with parameters", () => {
    const companions = Companion(
      {
        add: (a: number, b: number) => a + b,
        join: (words: string[], separator: string) => words.join(separator),
      },
      {},
    )

    expect(companions.add(2, 3)).toBe(5)
    expect(companions.join(["hello", "world"], "-")).toBe("hello-world")
  })
})
