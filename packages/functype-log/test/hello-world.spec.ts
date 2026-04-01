import { beforeEach, describe, expect, it } from "vitest"

import { helloWorld } from "../src"

describe("HelloWorld", () => {
  beforeEach(async () => {
    // Nothing
  })
  const test = helloWorld()

  it("parse valid number", () => {
    expect(test).toBe("Hello World!")
  })
})
