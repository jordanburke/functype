import { describe, expect, it } from "vitest"

import { FUNCTYPE_REACT_VERSION } from "../src"

describe("functype-react", () => {
  it("exposes a version constant matching the package", () => {
    expect(FUNCTYPE_REACT_VERSION).toBe("0.1.0")
  })
})
