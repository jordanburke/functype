import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Ratchet on eslint suppressions in `src/`.
 *
 * This package gates at `eslint src --max-warnings 0`, so every remaining
 * `eslint-disable` is a deliberate, reviewed exception rather than noise. Each one
 * below marks a place where a React or React Query contract is genuinely
 * incompatible with the rule's advice — a throw that must propagate to an
 * ErrorBoundary, a nullable parameter that is the hook's entire purpose, an
 * `Either` that a host library would read as success.
 *
 * The point of pinning the exact map (rather than a bare total) is that adding,
 * moving, or removing one is visible in review instead of drifting silently.
 *
 * **Adding an entry is not forbidden — it just has to be a decision.** If a new
 * suppression is right, update this map in the same commit and say why in the
 * message. Prefer making the boundary structural instead: a host-contract bridge
 * takes an `@interop <reason>` JSDoc tag (see EXPECTED_INTEROP below), which the
 * functype rules honor for that declaration only.
 *
 * The three left are the `eqs` parameter of the useStable* hooks — an API choice,
 * not a host contract, so they stay line-level disables until the 2.0 API change.
 */
const EXPECTED_SUPPRESSIONS: Readonly<Record<string, number>> = {
  "hooks/useStableCallback.ts": 1,
  "hooks/useStableEffect.ts": 1,
  "hooks/useStableMemo.ts": 1,
}

/**
 * Inventory of `@interop` markers (#241) — every place this package bridges functype to a
 * host whose contract IS the non-FP shape. Pinned like the suppressions, so a new
 * boundary is visible in review rather than a quiet exemption.
 */
const EXPECTED_INTEROP: Readonly<Record<string, number>> = {
  "async/useIO.ts": 1,
  "async/useIOValue.ts": 1,
  "hooks/useOption.ts": 1,
  "query/ioQueryFn.ts": 1,
}

const SRC_DIR = join(import.meta.dirname, "..", "src")

const sourceFiles = (dir: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })

const countSuppressions = (file: string): number => (readFileSync(file, "utf8").match(/eslint-disable/g) ?? []).length

const countInteropMarkers = (file: string): number => (readFileSync(file, "utf8").match(/@interop\s+\S/g) ?? []).length

const countBy = (count: (file: string) => number): Record<string, number> =>
  Object.fromEntries(
    sourceFiles(SRC_DIR)
      .map((file) => [relative(SRC_DIR, file).split("\\").join("/"), count(file)] as const)
      .filter(([, n]) => n > 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  )

describe("eslint suppression ratchet", () => {
  it("matches the reviewed set of suppressions exactly", () => {
    const actual = Object.fromEntries(
      sourceFiles(SRC_DIR)
        .map((file) => [relative(SRC_DIR, file).split("\\").join("/"), countSuppressions(file)] as const)
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => a.localeCompare(b)),
    )

    expect(actual).toEqual(EXPECTED_SUPPRESSIONS)
  })

  it("keeps every suppression justified with an inline reason", () => {
    const unjustified = sourceFiles(SRC_DIR).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, index) =>
          line.includes("eslint-disable") && !line.includes("--") ? [`${relative(SRC_DIR, file)}:${index + 1}`] : [],
        ),
    )

    // eslint's `--` convention carries the rationale; a bare disable says nothing.
    expect(unjustified).toEqual([])
  })

  it("matches the reviewed set of @interop boundaries exactly", () => {
    expect(countBy(countInteropMarkers)).toEqual(EXPECTED_INTEROP)
  })
})
