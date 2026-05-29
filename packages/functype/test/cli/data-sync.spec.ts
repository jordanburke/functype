import * as path from "path"
import { describe, expect, it } from "vitest"

import { TYPES } from "@/cli/data"
import { computeAllInterfaces, TYPE_SOURCES } from "../../scripts/parse-interfaces"

/**
 * Asserts that every interface declared in a type's `extends` chain shows up
 * in src/cli/data.ts. Drift here is exactly the bug that hid `Doable` from
 * search_docs for Option/Either/Try in 0.60.x — the MCP server reads this
 * data verbatim, so a missing entry == a missing trait downstream.
 *
 * This is a superset check, not equality: hand-curated additions (for methods
 * implemented inline rather than via `extends`, e.g. List.map) are allowed.
 * What's forbidden is dropping anything the source actually says it implements.
 *
 * If this test fails, run `pnpm generate:interfaces` to regenerate
 * src/cli/interfaces.generated.ts, then re-run.
 */
describe("cli/data.ts ↔ source extends parity", () => {
  const packageRoot = path.resolve(__dirname, "../..")
  const computed = computeAllInterfaces(packageRoot)

  for (const typeName of Object.keys(TYPE_SOURCES)) {
    it(`${typeName}.interfaces is a superset of the parsed extends chain`, () => {
      const fromSource = computed[typeName] ?? []
      const fromData = new Set(TYPES[typeName]?.interfaces ?? [])
      const missing = fromSource.filter((n) => !fromData.has(n))
      expect(missing).toEqual([])
    })
  }

  it("every TYPE_SOURCES entry has a corresponding TYPES entry", () => {
    const missing = Object.keys(TYPE_SOURCES).filter((n) => !TYPES[n])
    expect(missing).toEqual([])
  })
})
