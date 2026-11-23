// The benchmark results that functype.org/performance and the home page read. packages/bench writes
// src/data/perf.json; the docs deploy replaces it with the latest run from the perf-data branch.
import data from "./perf.json";

type Spread = {
  readonly median: number;
  readonly min: number;
  readonly max: number;
};
export type Verdict = "faster" | "same" | "slower";
type Ratio = Spread & { readonly verdict: Verdict };

export type PerfCase = {
  readonly id: string;
  readonly group: string;
  readonly name: string;
  readonly async: boolean;
  readonly code: { readonly functype: string; readonly effect: string };
  readonly ns: { readonly functype: Spread; readonly effect: Spread };
  readonly vsEffect: Ratio;
};

export type PerfBundle = {
  readonly id: string;
  readonly name: string;
  readonly code: { readonly functype: string; readonly effect: string };
  readonly sizes: {
    readonly functype: { readonly gzipped: number };
    readonly effect: { readonly gzipped: number };
  };
};

export type Perf = {
  readonly generated: string;
  readonly commit: string;
  readonly machine: {
    readonly cpu: string;
    readonly cores: number;
    readonly os: string;
    readonly ci: boolean;
  };
  readonly versions: {
    readonly node: string;
    readonly functype: string;
    readonly effect: string;
  };
  readonly method: { readonly processes: number; readonly rounds: number };
  readonly setup: string;
  readonly cases: ReadonlyArray<PerfCase>;
  readonly bundles: ReadonlyArray<PerfBundle>;
};

export const perf: Perf = data as Perf;

export const caseById = (id: string): PerfCase | undefined =>
  perf.cases.find((c) => c.id === id);
export const bundleById = (id: string): PerfBundle | undefined =>
  perf.bundles.find((b) => b.id === id);

export const formatNs = (ns: number): string =>
  ns >= 1000
    ? `${(ns / 1000).toFixed(ns >= 10_000 ? 0 : 2)} µs`
    : `${ns.toFixed(ns >= 100 ? 0 : 1)} ns`;

/** The number and unit apart, for a big figure with a small unit. */
export const splitNs = (ns: number): readonly [string, string] => {
  const [n, unit] = formatNs(ns).split(" ");
  return [n ?? "", unit ?? ""];
};

export const formatKb = (bytes: number): string => (bytes / 1000).toFixed(1);

/** Effect's time over functype's: above 1, functype is faster. */
export const ratioLabel = ({ median, verdict }: Ratio): string =>
  verdict === "same"
    ? "About the same"
    : verdict === "faster"
      ? `${median.toFixed(1)}× faster`
      : `${(1 / median).toFixed(1)}× slower`;

/** A bar's width, as a percentage of the larger of the two. */
export const widths = (a: number, b: number): readonly [number, number] => {
  const top = Math.max(a, b);
  return [
    Math.max(2, Math.round((a / top) * 100)),
    Math.max(2, Math.round((b / top) * 100)),
  ];
};

/** Function.prototype.toString keeps the indentation the code had in its file; take it back out. */
export const dedent = (code: string): string => {
  const lines = code.split("\n");
  const rest = lines.slice(1).filter((l) => l.trim() !== "");
  const indent =
    rest.length === 0
      ? 0
      : Math.min(...rest.map((l) => l.length - l.trimStart().length));
  return [lines[0], ...lines.slice(1).map((l) => l.slice(indent))].join("\n");
};

export const counts = (): Readonly<Record<Verdict, number>> => ({
  faster: perf.cases.filter((c) => c.vsEffect.verdict === "faster").length,
  same: perf.cases.filter((c) => c.vsEffect.verdict === "same").length,
  slower: perf.cases.filter((c) => c.vsEffect.verdict === "slower").length,
});

export const runDate = (): string => perf.generated.slice(0, 10);
