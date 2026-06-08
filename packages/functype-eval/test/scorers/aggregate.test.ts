import { describe, expect, it } from "vitest"

import { aggregate, type AggregateInputs } from "../../src/scorers/aggregate"
import { DEFAULT_DIMENSIONS } from "../../src/types/index"

const baseInputs = (overrides: Partial<AggregateInputs> = {}): AggregateInputs => ({
  target: "fixture",
  dimensions: DEFAULT_DIMENSIONS,
  ruleCounts: new Map<string, number>(),
  typeCoverage: { skipped: false, score: 1, percent: 100 },
  tsMorph: { nonNull: 0, loc: 1000, fileCount: 1 },
  ...overrides,
})

describe("aggregate", () => {
  it("scores a clean codebase 100", () => {
    const result = aggregate(baseInputs())
    expect(result.score).toBe(100)
    expect(result.dimensions).toHaveLength(DEFAULT_DIMENSIONS.length)
  })

  it("applies the density formula (2 no-let violations over 1 KLOC, k=0.5 → 0.5)", () => {
    const result = aggregate(baseInputs({ ruleCounts: new Map([["functype/no-let", 2]]) }))
    const immutability = result.dimensions.find((d) => d.id === "immutability")
    expect(immutability?.score).toBeCloseTo(0.5, 5)
    expect(immutability?.violations).toBe(2)
    expect(result.score).toBeLessThan(100)
  })

  it("sums multiple rules into the composition dimension (incl. prefer-map)", () => {
    const result = aggregate(
      baseInputs({
        ruleCounts: new Map([
          ["functype/prefer-flatmap", 1],
          ["functype/prefer-fold", 1],
          ["functype/prefer-map", 1],
        ]),
      }),
    )
    expect(result.dimensions.find((d) => d.id === "composition")?.violations).toBe(3)
  })

  it("is monotonic — more violations never raises the score", () => {
    const few = aggregate(baseInputs({ ruleCounts: new Map([["functype/prefer-option", 1]]) }))
    const many = aggregate(baseInputs({ ruleCounts: new Map([["functype/prefer-option", 10]]) }))
    expect(many.score).toBeLessThan(few.score)
  })

  it("skips type-coverage and renormalizes the remaining 9 weights", () => {
    const result = aggregate(baseInputs({ typeCoverage: { skipped: true, score: 0, percent: 0 } }))
    const tc = result.dimensions.find((d) => d.id === "type-coverage")
    expect(tc?.skipped).toBe(true)
    expect(tc?.detail).toMatch(/skipped/)
    // Everything else perfect → renormalized composite is still 100.
    expect(result.score).toBe(100)
  })

  it("counts the non-null dimension from the ts-morph scan", () => {
    const result = aggregate(baseInputs({ tsMorph: { nonNull: 5, loc: 1000, fileCount: 2 } }))
    const nonNull = result.dimensions.find((d) => d.id === "non-null")
    expect(nonNull?.violations).toBe(5)
    expect(nonNull?.score).toBeLessThan(1)
  })

  it("treats an empty target (0 LOC) as a perfect density score", () => {
    const result = aggregate(baseInputs({ tsMorph: { nonNull: 0, loc: 0, fileCount: 0 } }))
    expect(result.score).toBe(100)
    expect(result.loc).toBe(0)
  })

  it("honors weight overrides passed via the dimensions list", () => {
    const heavyImmutability = DEFAULT_DIMENSIONS.map((d) =>
      d.id === "immutability" ? { ...d, weight: 0.9 } : { ...d, weight: 0.0125 },
    )
    const result = aggregate(
      baseInputs({ dimensions: heavyImmutability, ruleCounts: new Map([["functype/no-let", 2]]) }),
    )
    // immutability (score 0.5) dominates the weighting → composite near 50.
    expect(result.score).toBeGreaterThan(45)
    expect(result.score).toBeLessThan(60)
  })
})
