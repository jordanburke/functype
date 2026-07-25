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
 * message. If you can instead make the rule understand the boundary structurally,
 * prefer that: see the `@interop` marker proposal for `eslint-plugin-functype`.
 */
const EXPECTED_SUPPRESSIONS: Readonly<Record<string, number>> = {
  "async/useTaskValue.ts": 1,
  "hooks/useOption.ts": 1,
  "hooks/useStableCallback.ts": 1,
  "hooks/useStableEffect.ts": 1,
  "hooks/useStableMemo.ts": 1,
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
})
