import { describe, expect, it } from "vitest"

import * as root from "../src"
import { LoggerLive } from "../src/layers"

/** functype-log 2.0 has no loglayer bridge: these pin that the public surface stays without one. */
describe("public surface", () => {
  it("has no logLayerAdapter", () => {
    expect(Object.keys(root)).not.toContain("logLayerAdapter")
  })

  it("gives LoggerLive only console and silent", () => {
    expect(Object.keys(LoggerLive).sort()).toEqual(["console", "silent"])
  })
})
