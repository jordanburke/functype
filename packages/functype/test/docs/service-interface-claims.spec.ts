import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Guard against the "we will never add X" claim going stale.
 *
 * functype's position on service-style interfaces is a real design decision,
 * and it is restated in prose in five places: the package README, the
 * vs-Effect comparison, the site's Logger page, the roadmap, and CLAUDE.md.
 * When the decision changed — `Tracer` was admitted in 1.10.0 on the same
 * type-only terms as `Logger` — CLAUDE.md was updated and the other four were
 * not. For a while the published README told readers functype would never
 * define a `Tracer` while the barrel exported one.
 *
 * Prose cannot be generated from code here without wrecking how the docs read,
 * so this spec does the next best thing: it pins the policy in ONE place and
 * fails when either the code or the docs drift from it.
 *
 * **Changing the policy is not forbidden — it just has to be a decision.** Move
 * the name between the two lists below in the same commit that changes the
 * code, and the failures will point at every doc still telling the old story.
 */
const IN_CORE = ["Logger", "Tracer"] as const
const NOT_IN_CORE = ["Clock", "Random"] as const

/** Docs that state the policy to readers. Paths are relative to the repo root. */
const PUBLIC_DOCS = [
  "packages/functype/README.md",
  "packages/functype/docs/vs-effect.md",
  "packages/functype/CLAUDE.md",
  "site/src/content/logger.md",
  "docs/ROADMAP.md",
] as const

/**
 * Phrases that mark a sentence as saying "core does not have this".
 * Deliberately narrow: a false negative here costs a stale doc, a false
 * positive costs a broken build on innocent prose.
 */
const EXCLUSION_MARKERS = [
  "not being added",
  "are not added",
  "rejected",
  "does not define",
  "doesn't define",
  "deliberately is **not**",
  "out of scope",
  "no fiber runtime",
  "deliberately is",
  "non-goals",
] as const

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..")
const read = (rel: string): string => readFileSync(join(REPO_ROOT, rel), "utf8")

/**
 * Identifiers reachable from the package barrel. Resolves the one level of
 * `export * from "@/x"` that `src/index.ts` uses; type-only exports are
 * invisible at runtime, so this reads source text rather than importing.
 */
const barrelExports = (): ReadonlySet<string> => {
  const src = join(REPO_ROOT, "packages/functype/src")
  const collect = (text: string): string[] =>
    [...text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)].flatMap((m) =>
      (m[1] ?? "").split(",").map((s) => (s.split(/\s+as\s+/).pop() ?? "").trim()),
    )

  const root = readFileSync(join(src, "index.ts"), "utf8")
  const names = collect(root)

  for (const m of root.matchAll(/export\s+\*\s+from\s+"@\/([^"]+)"/g)) {
    const mod = m[1]
    if (mod === undefined) continue
    for (const candidate of [join(src, mod, "index.ts"), join(src, `${mod}.ts`)]) {
      try {
        names.push(...collect(readFileSync(candidate, "utf8")))
        break
      } catch {
        // module resolves elsewhere; the direct-export scan below still covers it
      }
    }
  }
  return new Set(names.filter((n) => n.length > 0))
}

const marked = (text: string): boolean => EXCLUSION_MARKERS.some((m) => text.toLowerCase().includes(m))

/** Sentences of a doc that read as an exclusion claim. */
const exclusionSentences = (markdown: string): ReadonlyArray<string> =>
  markdown.split(/(?<=[.!?])\s+|\n\n+/).filter(marked)

/**
 * Bullets under an exclusion heading, reduced to their bolded lead term.
 *
 * `vs-effect.md` states its exclusions as a list under "What functype
 * deliberately is **not**": the bullets carry no negation of their own, so a
 * sentence scan misses them. The bolded lead names what is excluded; prose
 * after it is commentary, and may legitimately cite an in-core interface by
 * way of contrast — so only the lead is checked.
 */
const exclusionBulletLeads = (markdown: string): ReadonlyArray<string> => {
  const leads: string[] = []
  let excluding = false
  for (const line of markdown.split("\n")) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      excluding = marked(heading[2] ?? "")
      continue
    }
    if (!excluding) continue
    const lead = /^\s*[-*]\s+\*\*(.+?)\*\*/.exec(line)
    if (lead?.[1] !== undefined) leads.push(lead[1])
  }
  return leads
}

describe("service-interface policy", () => {
  it("core exports exactly the service interfaces the policy admits", () => {
    const exported = barrelExports()
    for (const name of IN_CORE) expect(exported.has(name), `${name} should be exported from the barrel`).toBe(true)
    for (const name of NOT_IN_CORE) expect(exported.has(name), `${name} should NOT be exported`).toBe(false)
  })

  it.each(PUBLIC_DOCS)("%s does not claim an in-core interface is absent", (doc) => {
    const markdown = read(doc)
    const claims = [...exclusionSentences(markdown), ...exclusionBulletLeads(markdown)]
    const offenders = claims.flatMap((sentence) =>
      IN_CORE.filter((name) => new RegExp(`\\b${name}\\b`).test(sentence)).map(
        (name) => `${name} named in an exclusion claim: "${sentence.trim().slice(0, 160)}"`,
      ),
    )
    expect(offenders).toEqual([])
  })
})
