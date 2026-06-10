/**
 * Combines the three scorer outputs into a single `ScoreResult`.
 *
 * Lint and non-null dimensions normalize by violation density:
 *   score = 1 / (1 + (violations / KLOC) * k)
 * `type-coverage` contributes its native ratio. The composite is a weighted average over the active
 * (non-skipped) dimensions — weights are normalized by the active-weight sum, so it stays a proper
 * 0–1 average even when `type-coverage` is skipped or weights are overridden.
 */

import { type DimensionConfig, type DimensionScore, type ScoreResult } from "../types/index"
import { type RuleCounts } from "./eslint"
import { type TsMorphResult } from "./ts-morph"
import { type TypeCoverageResult } from "./type-coverage"

export type AggregateInputs = {
  readonly target: string
  readonly dimensions: ReadonlyArray<DimensionConfig>
  readonly ruleCounts: RuleCounts
  readonly typeCoverage: TypeCoverageResult
  readonly tsMorph: TsMorphResult
}

const density = (violations: number, kloc: number, k: number): number =>
  kloc <= 0 ? 1 : 1 / (1 + (violations / kloc) * k)

/** Sum the violation counts for the rules owning a given dimension. */
const lintViolations = (dim: DimensionConfig, ruleCounts: RuleCounts): number =>
  dim.rules.reduce((total, rule) => total + (ruleCounts.get(`functype/${rule}`) ?? 0), 0)

type RawDimension = {
  readonly id: DimensionConfig["id"]
  readonly weight: number
  readonly score: number
  readonly violations: number
  readonly detail: string
  readonly skipped: boolean
}

const scoreDimension = (dim: DimensionConfig, inputs: AggregateInputs, kloc: number): RawDimension => {
  const klocLabel = `${kloc.toFixed(2)} KLOC`
  switch (dim.kind) {
    case "lint": {
      const violations = lintViolations(dim, inputs.ruleCounts)
      return {
        id: dim.id,
        weight: dim.weight,
        score: density(violations, kloc, dim.k),
        violations,
        detail: `${violations} violations / ${klocLabel}`,
        skipped: false,
      }
    }
    case "non-null": {
      const violations = inputs.tsMorph.nonNull
      return {
        id: dim.id,
        weight: dim.weight,
        score: density(violations, kloc, dim.k),
        violations,
        detail: `${violations} non-null assertions / ${klocLabel}`,
        skipped: false,
      }
    }
    case "type-coverage": {
      const tc = inputs.typeCoverage
      return tc.skipped
        ? { id: dim.id, weight: dim.weight, score: 0, violations: 0, detail: "skipped (no tsconfig)", skipped: true }
        : {
            id: dim.id,
            weight: dim.weight,
            score: tc.score,
            violations: 0,
            detail: `${tc.percent.toFixed(1)}% typed`,
            skipped: false,
          }
    }
  }
}

export const aggregate = (inputs: AggregateInputs): ScoreResult => {
  const { loc } = inputs.tsMorph
  const kloc = loc / 1000

  const raw = inputs.dimensions.map((dim) => scoreDimension(dim, inputs, kloc))

  const activeWeight = raw.filter((d) => !d.skipped).reduce((sum, d) => sum + d.weight, 0)
  const composite =
    activeWeight <= 0
      ? 0
      : raw.filter((d) => !d.skipped).reduce((sum, d) => sum + (d.weight / activeWeight) * d.score, 0)

  const dimensions: ReadonlyArray<DimensionScore> = raw.map((d) => ({
    id: d.id,
    weight: d.weight,
    score: d.score,
    violations: d.violations,
    detail: d.detail,
    skipped: d.skipped,
  }))

  return {
    target: inputs.target,
    score: Math.round(composite * 100),
    loc,
    fileCount: inputs.tsMorph.fileCount,
    dimensions,
  }
}
