/**
 * No interface in src extends a mapped type such as `Omit<Base, …>`. In 2.0 every value type shares
 * its methods through a prototype, so a detached call such as `xs.forEach(list.contains)` throws,
 * and `@typescript-eslint/unbound-method` is what finds those calls. A member reached through a
 * mapped type has no declaration, and the rule skips it: List, Set, Map and Obj inherited 45 such
 * members through `Omit<FunctypeBase, …>`, `Omit<Functype, …>` and `Omit<Traversable, …>` until
 * they were split into `FunctypeCore`, `FunctypeValue` and `Reducible`.
 *
 * To drop members from a base, split the base instead: extend the part you keep.
 */
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const SRC = join(import.meta.dirname, "..", "..", "src")

const MAPPED = /\b(Omit|Pick|Partial|Required)</

/**
 * Each `interface X extends …` clause in src that names a mapped type, and each type alias that is
 * one, such as `type KVTraversable<A> = Omit<Traversable<A>, …>`, as `file: X`. `Readonly<Record<…>>`
 * data aliases hold no methods, so `Readonly` is allowed in an alias.
 */
const mappedBases = (): ReadonlyArray<string> =>
  readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".ts"))
    .flatMap((file) => {
      const text = readFileSync(join(SRC, file), "utf8")
      const interfaces = [...text.matchAll(/\binterface\s+(\w+)(?:<[^{]*?>)?\s+extends\s+([^{]*)\{/g)].filter(
        (match) => MAPPED.test(match[2] ?? "") || /\bReadonly</.test(match[2] ?? ""),
      )
      const aliases = [...text.matchAll(/\btype\s+(\w+)(?:<[^=]*?>)?\s*=\s*(Omit|Pick|Partial|Required)</g)]
      return [...interfaces, ...aliases].map((match) => `${file}: ${match[1] ?? ""}`)
    })

describe("interfaces in src", () => {
  it("extend no mapped type, so unbound-method sees every inherited member", () => {
    expect(mappedBases()).toEqual([])
  })
})
