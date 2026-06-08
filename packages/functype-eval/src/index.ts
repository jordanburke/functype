/**
 * functype-eval public API.
 *
 * `score(target, options)` runs the three scorers and aggregates them into a `ScoreResult`. The
 * result is deterministic: same input → same output, no network, no LLM calls.
 */

import { aggregate } from "./scorers/aggregate"
import { scoreEslint } from "./scorers/eslint"
import { scoreTsMorph } from "./scorers/ts-morph"
import { scoreTypeCoverage } from "./scorers/type-coverage"
import { DEFAULT_DIMENSIONS, type DimensionConfig, type ScoreOptions, type ScoreResult } from "./types/index"

export type { DimensionConfig, DimensionId, DimensionScore, ScoreOptions, ScoreResult } from "./types/index"
export { DEFAULT_DIMENSIONS } from "./types/index"

/** Apply per-dimension weight overrides (e.g. from `functype-eval.config.json`) to the defaults. */
const applyWeightOverrides = (
  dimensions: ReadonlyArray<DimensionConfig>,
  weights?: ScoreOptions["weights"],
): ReadonlyArray<DimensionConfig> =>
  weights === undefined
    ? dimensions
    : dimensions.map((dim) => {
        const override = weights[dim.id]
        return override === undefined ? dim : { ...dim, weight: override }
      })

/** Score a directory for functype/FP fitness. */
export const score = async (target: string, options: ScoreOptions = {}): Promise<ScoreResult> => {
  const dimensions = applyWeightOverrides(DEFAULT_DIMENSIONS, options.weights)

  // scoreEslint is the only async scorer; type-coverage (lintSync) and ts-morph are CPU-bound and
  // synchronous, so there's nothing to parallelize — sequence them after the lint pass.
  const ruleCounts = await scoreEslint(target, dimensions)
  const typeCoverage = scoreTypeCoverage(target, options.project)
  const tsMorph = scoreTsMorph(target)

  return aggregate({ target, dimensions, ruleCounts, typeCoverage, tsMorph })
}
