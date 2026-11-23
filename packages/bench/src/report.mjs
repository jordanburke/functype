// The Markdown report: a PR comment, or a summary on the terminal.

export const MARKER = "<!-- functype-perf -->"

export const formatNs = (ns) =>
  ns >= 1000 ? `${(ns / 1000).toFixed(ns >= 10_000 ? 0 : 2)} µs` : `${ns.toFixed(ns >= 100 ? 0 : 1)} ns`

export const formatKb = (bytes) => `${(bytes / 1000).toFixed(1)} KB`

/** A ratio of the other side's time to functype's: above 1, functype is faster. */
export const formatRatio = ({ median, verdict }) =>
  verdict === "same"
    ? "about the same"
    : verdict === "faster"
      ? `${median.toFixed(1)}× faster`
      : `${(1 / median).toFixed(1)}× slower`

const range = ({ min, max }) => `${min.toFixed(2)}–${max.toFixed(2)}`

export const renderMarkdown = (r) => {
  const hasBase = r.cases.some((c) => c.vsBase)
  const lines = [
    MARKER,
    "## Performance: functype against Effect",
    "",
    `functype ${r.versions.functype} (this PR's build) against Effect ${r.versions.effect}, on Node ${r.versions.node}, ${r.machine.cpu}. Medians of ${r.method.processes} processes × ${r.method.rounds} rounds.` +
      (hasBase
        ? " \"vs base branch\" times this build against the base branch's in processes of their own, and its range is the base's time over this build's in each process: above 1 is faster."
        : " The range is Effect's time over functype's in each process.") +
      " Timings on shared CI runners move by 10% or so between runs, so this never fails a build.",
    "",
    hasBase
      ? "| Case | functype | Effect | vs Effect | vs base branch | range |"
      : "| Case | functype | Effect | vs Effect | ratio range |",
    hasBase ? "| --- | ---: | ---: | --- | --- | ---: |" : "| --- | ---: | ---: | --- | ---: |",
    ...r.cases.map((c) =>
      hasBase
        ? `| ${c.name} | ${formatNs(c.ns.functype.median)} | ${formatNs(c.ns.effect.median)} | ${formatRatio(c.vsEffect)} | ${c.vsBase.verdict === "same" ? "no change" : c.vsBase.verdict === "faster" ? `**${c.vsBase.median.toFixed(2)}× faster**` : `**${(1 / c.vsBase.median).toFixed(2)}× slower**`} | ${range(c.vsBase)} |`
        : `| ${c.name} | ${formatNs(c.ns.functype.median)} | ${formatNs(c.ns.effect.median)} | ${formatRatio(c.vsEffect)} | ${range(c.vsEffect)} |`,
    ),
    "",
    "| Bundle, gzipped | functype | Effect |" + (hasBase ? " base branch |" : ""),
    "| --- | ---: | ---: |" + (hasBase ? " ---: |" : ""),
    ...r.bundles.map(
      (b) =>
        `| ${b.name} | ${formatKb(b.sizes.functype.gzipped)} | ${formatKb(b.sizes.effect.gzipped)} |` +
        (hasBase ? ` ${formatKb(b.sizes.base.gzipped)} |` : ""),
    ),
    "",
    "Rerun: `pnpm -F functype build && pnpm -F functype-bench bench`. The cases are in `packages/bench/src/cases.mjs`.",
    "",
  ]
  return lines.join("\n")
}
