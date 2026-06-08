import { afterAll, describe, expect, it } from "vitest"

import { scoreEslint } from "../../src/scorers/eslint"
import { removeProject, totalViolations, writeProject } from "../helpers/tmp"

// Functype-idiomatic: pure scalar functions — no `let`, no nullable returns, no imperative loops,
// no try/catch, and no native collection types (which prefer-list / prefer-functype-* would flag).
const GOOD = `export const add = (a: number, b: number): number => a + b
export const greet = (name: string): string => \`hello \${name}\`
export const square = (n: number): number => n * n
`

// Imperative: mutable bindings, a for-loop, and a nullable return — multiple rules fire.
const BAD = `export function total(items: number[]): number {
  let sum = 0
  for (let i = 0; i < items.length; i++) {
    sum += items[i]
  }
  return sum
}
export function firstName(name: string | null): string | null {
  if (name) {
    return name
  }
  return null
}
`

const goodDir = writeProject({ "good.ts": GOOD })
const badDir = writeProject({ "bad.ts": BAD })

afterAll(() => {
  removeProject(goodDir)
  removeProject(badDir)
})

describe("scoreEslint", () => {
  it("reports zero violations for idiomatic functype code", async () => {
    const counts = await scoreEslint(goodDir)
    expect(totalViolations(counts)).toBe(0)
  })

  it("reports violations for imperative code", async () => {
    const counts = await scoreEslint(badDir)
    expect(totalViolations(counts)).toBeGreaterThan(0)
    // `let` bindings should be flagged by no-let.
    expect(counts.get("functype/no-let") ?? 0).toBeGreaterThan(0)
  })

  it("ranks imperative code above idiomatic code in violation count", async () => {
    const [good, bad] = await Promise.all([scoreEslint(goodDir), scoreEslint(badDir)])
    expect(totalViolations(bad)).toBeGreaterThan(totalViolations(good))
  })

  it("returns zeroed counts (no throw) for an empty directory", async () => {
    const emptyDir = writeProject({ "readme.md": "no ts here" })
    const counts = await scoreEslint(emptyDir)
    expect(totalViolations(counts)).toBe(0)
    removeProject(emptyDir)
  })
})
