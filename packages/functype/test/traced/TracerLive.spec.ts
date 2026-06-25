import { describe, it, expect } from "vitest"
import { Tracer } from "../../src/traced/Tracer.js"

describe("Tracer Tag", () => {
  it("has a stable string id", () => {
    expect(Tracer.id).toBe("functype/Tracer")
  })
})
