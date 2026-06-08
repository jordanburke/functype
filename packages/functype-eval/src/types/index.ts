/**
 * Score types and the default dimension configuration.
 *
 * The fitness score is a weighted sum of dimension scores (each 0.0–1.0) scaled to 0–100. Lint and
 * non-null dimensions normalize by violation density (see `aggregate.ts`); `type-coverage` uses its
 * native percentage. Weights sum to 1.0 and are overridable via `functype-eval.config.json`.
 */

export type DimensionId =
  | "immutability"
  | "option"
  | "either"
  | "composition"
  | "collections"
  | "do-notation"
  | "safety"
  | "loops"
  | "type-coverage"
  | "non-null"

/**
 * How a dimension's raw signal is produced.
 * - `lint`        — violation counts from `eslint-plugin-functype` rules
 * - `type-coverage` — native percentage from `type-coverage-core`
 * - `non-null`    — `!` non-null assertion count from a ts-morph scan
 */
export type DimensionKind = "lint" | "type-coverage" | "non-null"

export type DimensionConfig = {
  readonly id: DimensionId
  readonly weight: number
  readonly kind: DimensionKind
  /** ESLint rule names (without the `functype/` prefix) feeding this dimension. Empty for non-lint. */
  readonly rules: ReadonlyArray<string>
  /** Density sensitivity for `score = 1 / (1 + (violations / KLOC) * k)`. Unused for `type-coverage`. */
  readonly k: number
}

/**
 * The ten default dimensions. All 12 `eslint-plugin-functype` rules are mapped here
 * (`prefer-map` lives under `composition`). Weights sum to 1.0.
 */
export const DEFAULT_DIMENSIONS: ReadonlyArray<DimensionConfig> = [
  { id: "immutability", weight: 0.15, kind: "lint", rules: ["no-let"], k: 0.5 },
  { id: "option", weight: 0.15, kind: "lint", rules: ["prefer-option"], k: 0.5 },
  { id: "either", weight: 0.15, kind: "lint", rules: ["prefer-either"], k: 0.5 },
  {
    id: "composition",
    weight: 0.1,
    kind: "lint",
    rules: ["prefer-flatmap", "prefer-fold", "prefer-map"],
    k: 0.3,
  },
  {
    id: "collections",
    weight: 0.1,
    kind: "lint",
    rules: ["prefer-list", "prefer-functype-map", "prefer-functype-set"],
    k: 0.3,
  },
  { id: "do-notation", weight: 0.05, kind: "lint", rules: ["prefer-do-notation"], k: 0.2 },
  { id: "safety", weight: 0.1, kind: "lint", rules: ["no-get-unsafe"], k: 1.0 },
  { id: "loops", weight: 0.05, kind: "lint", rules: ["no-imperative-loops"], k: 0.3 },
  { id: "type-coverage", weight: 0.1, kind: "type-coverage", rules: [], k: 0 },
  { id: "non-null", weight: 0.05, kind: "non-null", rules: [], k: 0.5 },
] as const

/** Per-dimension result after scoring and (if needed) weight renormalization. */
export type DimensionScore = {
  readonly id: DimensionId
  /** Effective weight used in the composite — renormalized if any dimension was skipped. */
  readonly weight: number
  /** Normalized dimension score, 0.0–1.0. */
  readonly score: number
  /** Raw violation/assertion count (0 for `type-coverage` and skipped dimensions). */
  readonly violations: number
  /** Human-readable detail, e.g. `"3 violations / 1.20 KLOC"`, `"98.7% typed"`, `"skipped (no tsconfig)"`. */
  readonly detail: string
  /** True when the dimension was excluded and its weight redistributed (only `type-coverage` today). */
  readonly skipped: boolean
}

export type ScoreResult = {
  readonly target: string
  /** Composite fitness score, 0–100 (rounded). */
  readonly score: number
  /** Total non-blank lines of code scanned. */
  readonly loc: number
  readonly dimensions: ReadonlyArray<DimensionScore>
}

export type ScoreOptions = {
  /** Explicit tsconfig path for the `type-coverage` dimension. Falls back to autodetect, then skip. */
  readonly project?: string
  /** Per-dimension weight overrides (e.g. from `functype-eval.config.json`). */
  readonly weights?: Partial<Record<DimensionId, number>>
}

/** All ESLint rule names (without prefix) that feed any lint dimension. */
export const enabledRuleNames = (
  dimensions: ReadonlyArray<DimensionConfig> = DEFAULT_DIMENSIONS,
): ReadonlyArray<string> => dimensions.flatMap((d) => d.rules)

/** Reverse map: `functype/<rule>` rule id → owning dimension id. */
export const ruleToDimension = (
  dimensions: ReadonlyArray<DimensionConfig> = DEFAULT_DIMENSIONS,
): ReadonlyMap<string, DimensionId> =>
  new Map(dimensions.flatMap((d) => d.rules.map((rule) => [`functype/${rule}`, d.id] as const)))
