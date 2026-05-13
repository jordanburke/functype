import { describe, expect, it } from "vitest"

import * as functypeReact from "../src"

describe("functype-react main entry", () => {
  it("re-exports Tier 1 hooks (stable hooks + ADT hooks + eq helpers)", () => {
    expect(typeof functypeReact.useStableState).toBe("function")
    expect(typeof functypeReact.useStableEffect).toBe("function")
    expect(typeof functypeReact.useStableMemo).toBe("function")
    expect(typeof functypeReact.useStableCallback).toBe("function")
    expect(typeof functypeReact.useOption).toBe("function")
    expect(typeof functypeReact.useEither).toBe("function")
    expect(typeof functypeReact.useTry).toBe("function")
    expect(typeof functypeReact.useList).toBe("function")
    expect(typeof functypeReact.referenceEq).toBe("function")
    expect(typeof functypeReact.structuralEq).toBe("function")
    expect(typeof functypeReact.tagEq).toBe("function")
  })

  it("re-exports Tier 2 Match family components", () => {
    expect(typeof functypeReact.Match).toBe("function")
    expect(typeof functypeReact.MatchOption).toBe("function")
    expect(typeof functypeReact.MatchEither).toBe("function")
    expect(typeof functypeReact.MatchTry).toBe("function")
  })

  it("intentionally does NOT re-export ./async or ./forms from the main entry (subpath-only)", () => {
    expect((functypeReact as Record<string, unknown>).useTask).toBeUndefined()
    expect((functypeReact as Record<string, unknown>).TaskBoundary).toBeUndefined()
    expect((functypeReact as Record<string, unknown>).useValidatedField).toBeUndefined()
    expect((functypeReact as Record<string, unknown>).useValidatedForm).toBeUndefined()
  })
})
