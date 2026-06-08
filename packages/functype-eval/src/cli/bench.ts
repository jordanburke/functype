/**
 * `functype-eval bench` — Phase 2 LLM eval harness. Not yet implemented.
 *
 * Planned: run a suite of TypeScript programming tasks through LLMs under varying context conditions
 * (zero-shot, few-shot, full docs, MCP), then score each generated solution with the Phase 1 scorer
 * (`score()` from the package root) to produce a model × context results table.
 */

export const runBench = (_args: ReadonlyArray<string>): number => {
  console.error(
    [
      "functype-eval bench — not yet implemented (Phase 2).",
      "",
      "Phase 1 (`functype-eval score <target>`) is the deterministic scorer that Phase 2 will use as",
      "its metric. The LLM eval harness lands in a future release.",
    ].join("\n"),
  )
  return 1
}
