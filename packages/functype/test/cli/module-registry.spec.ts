import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { CATEGORIES, TYPES } from "@/cli/data"

/**
 * Every module the package barrel exports must be either documented in `src/cli/data.ts` or marked
 * internal, with a reason. `data.ts` is the single source for `npx functype`, the MCP server's
 * `search_docs` (it loads `functype/cli` at runtime), and the site's generated `llms.txt` /
 * `reference.md` — so an unregistered module is invisible on all of them at once.
 *
 * That is exactly how TracedOption shipped (#304) and how Validation was hidden before it: nothing
 * failed. Adding a module now forces a decision here.
 */
const MODULE_DOCS: Readonly<Record<string, ReadonlyArray<string> | { readonly internal: string }>> = {
  branded: ["Brand", "ValidatedBrand"],
  collections: { internal: "the Collection interface — documented under `npx functype interfaces`" },
  companion: { internal: "Companion() — construction utility for implementers of new types" },
  conditional: ["Cond", "Match"],
  core: ["Task", "TaskOutcome", "TaskResult"],
  decoder: ["Decoder", "DecoderError"],
  do: ["Do"],
  either: ["Either"],
  error: ["TypedError", "Validation"],
  extractable: { internal: "typeclass interface — documented under `npx functype interfaces`" },
  fetch: ["Http", "HttpError"],
  foldable: { internal: "typeclass interface — documented under `npx functype interfaces`" },
  functype: { internal: "Functype / FunctypeSum base interfaces for implementers" },
  hkt: { internal: "higher-kinded type encoding for implementers" },
  identity: ["Identity"],
  io: ["IO", "Exit"],
  lazy: ["Lazy"],
  list: ["List", "LazyList"],
  logger: ["Logger"],
  map: ["Map"],
  matchable: { internal: "typeclass interface — documented under `npx functype interfaces`" },
  obj: ["Obj"],
  option: ["Option"],
  pipe: { internal: "the Pipe interface behind every container's .pipe() method" },
  ref: ["Ref"],
  serializable: { internal: "typeclass interface — documented under `npx functype interfaces`" },
  serialization: ["Serialization", "SerializedError"],
  set: ["Set"],
  stack: ["Stack"],
  traced: ["TracedOption", "Tracer"],
  traversable: { internal: "typeclass interface — documented under `npx functype interfaces`" },
  try: ["Try"],
  tuple: ["Tuple"],
  typeable: { internal: "Typeable runtime tagging for implementers" },
  typeclass: { internal: "typeclass interfaces and variance helpers for implementers" },
  types: { internal: "the `Type` constraint alias" },
  valuable: { internal: "Valuable interface for implementers" },
  wire: ["Wire"],
}

const barrelModules = (): ReadonlyArray<string> => {
  const barrel = readFileSync(join(import.meta.dirname, "..", "..", "src", "index.ts"), "utf8")
  return [...new Set([...barrel.matchAll(/from "@\/([a-z]+)/g)].map((m) => m[1]!))].sort()
}

const categorized = new Set<string>(Object.values(CATEGORIES).flat())

describe("cli/data.ts module registry", () => {
  it("covers every module the package barrel exports", () => {
    const unlisted = barrelModules().filter((m) => !(m in MODULE_DOCS))
    expect(unlisted).toEqual([])
  })

  it("registers every documented type in TYPES", () => {
    const missing = Object.values(MODULE_DOCS)
      .flatMap((docs) => (Array.isArray(docs) ? docs : []))
      .filter((name) => TYPES[name] === undefined)
    expect(missing).toEqual([])
  })

  it("places every registered type in a category (the overview and llms.txt list by category)", () => {
    const uncategorized = Object.keys(TYPES).filter((name) => !categorized.has(name))
    expect(uncategorized).toEqual([])
  })
})
