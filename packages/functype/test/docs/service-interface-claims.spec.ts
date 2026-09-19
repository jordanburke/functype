import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"

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
 * Identifiers reachable from the package barrel.
 *
 * Reads source text rather than importing, because type-only exports are
 * invisible at runtime — which is precisely how `Tracer` drifted unnoticed.
 * Follows `export *` and `export * as Ns` transitively; a shallow walk finds
 * only 102 of the 233 exported names, which would make the NOT_IN_CORE
 * assertion below quietly vacuous for any module that nests.
 */
const barrelExports = (): ReadonlySet<string> => {
  const src = join(REPO_ROOT, "packages/functype/src")
  const names = new Set<string>()
  const seen = new Set<string>()

  const resolve = (fromDir: string, spec: string): string | undefined => {
    const base = spec.startsWith("@/") ? join(src, spec.slice(2)) : join(fromDir, spec)
    for (const candidate of [`${base.replace(/\.js$/, "")}.ts`, join(base, "index.ts"), base]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
    }
    return undefined
  }

  const walk = (file: string): void => {
    if (seen.has(file)) return
    seen.add(file)
    const text = readFileSync(file, "utf8")
    const dir = dirname(file)

    for (const m of text.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g))
      for (const part of (m[1] ?? "").split(","))
        names.add((part.split(/\s+as\s+/).pop() ?? "").replace(/^type\s+/, "").trim())

    for (const m of text.matchAll(/export\s+(?:declare\s+)?(?:const|function|class|interface|type|enum)\s+(\w+)/g))
      if (m[1] !== undefined) names.add(m[1])

    for (const m of text.matchAll(/export\s+\*\s+as\s+(\w+)\s+from/g)) if (m[1] !== undefined) names.add(m[1])

    for (const m of text.matchAll(/export\s+\*\s+(?:as\s+\w+\s+)?from\s+"([^"]+)"/g)) {
      const target = m[1] === undefined ? undefined : resolve(dir, m[1])
      if (target !== undefined) walk(target)
    }
  }

  walk(join(src, "index.ts"))
  names.delete("")
  return names
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
  /**
   * Without this, the check above rots into a no-op. An earlier version of the
   * parser walked only one level and found 102 of 233 exported names: every
   * NOT_IN_CORE assertion passed because the parser could not see into a
   * nested `export *`, not because the name was absent. These sentinels each
   * live behind a nested re-export, so they fail the moment the walk stops
   * being transitive.
   */
  it("the export scan is not blind — sentinels behind nested re-exports resolve", () => {
    const exported = barrelExports()
    for (const sentinel of ["Applicative", "Companion", "Base", "Collection"])
      expect(exported.has(sentinel), `${sentinel} unreachable — export scan has gone shallow`).toBe(true)
    expect(exported.size).toBeGreaterThan(200)
  })

  it("core exports exactly the service interfaces the policy admits", () => {
    const exported = barrelExports()
    for (const name of IN_CORE) expect(exported.has(name), `${name} should be exported from the barrel`).toBe(true)
    for (const name of NOT_IN_CORE) expect(exported.has(name), `${name} should NOT be exported`).toBe(false)
  })

  it.each(PUBLIC_DOCS)("%s does not claim an in-core interface is absent", (doc) => {
    const markdown = read(doc)
    // Prose that legitimately pairs an exclusion with an in-core name can opt out.
    const optedOut = (c: string): boolean => c.includes("<!-- service-policy: ok -->")
    const claims = [...exclusionSentences(markdown), ...exclusionBulletLeads(markdown)].filter((c) => !optedOut(c))
    const offenders = claims.flatMap((sentence) =>
      IN_CORE.filter((name) => new RegExp(`\\b${name}\\b`).test(sentence)).map(
        (name) => `${name} named in an exclusion claim: "${sentence.trim().slice(0, 160)}"`,
      ),
    )
    expect(offenders).toEqual([])
  })
})
