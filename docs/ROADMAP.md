# Roadmap — post-1.3.x execution plan

*Drafted 2026-06-09, from a full-monorepo review. Five workstreams. Suggested order:*
***2 → 4 → 1 → 5 → 3*** *— positioning is a day, the rule audit gates the bench (the bench
inherits rule bias), Task/IO is the long pole and lands across releases.*

Dependency graph: **2** standalone · **4 → 1** (hard ordering) · **5** standalone · **3** spans
releases independently.

| # | Workstream | Size | Gates |
|---|---|---|---|
| 1 | functype-eval Phase 2 bench | M | after 4 |
| 2 | Positioning doc (vs Effect) | S | — |
| 3 | Task → IO consolidation | L | removal waits for 2.0 |
| 4 | ESLint rule aggressiveness audit | M | — |
| 5 | Performance honesty | S | — |

Grounding facts (verified 2026-06-09): `core/task/Task.ts` is 1,062 LOC; IO already has
interruption semantics (`Exit` with `Interrupted` + fiberId); Task's main consumer is
functype-react's entire async module (`useTask`, `useTaskPromise`, `useTaskValue`, `TaskState`,
`TaskBoundary`); self-scores via functype-eval: functype core 50, functype-os 57, functype-eval 73.

---

## 1. Ship functype-eval Phase 2 (the bench)

**Goal:** a published table showing whether models write measurably better TypeScript with
functype + context than without. This is the empirical test of the library's core thesis (FP
constraints narrow the LLM solution space → "compiles ≈ correct" holds more often), and the
marketing artifact no competing FP library has.

1. **Task suite** (~15 tasks, checked into `packages/functype-eval/tasks/`): realistic app-level
   problems — parse-config-with-fallbacks, user service with error handling, paginated API client,
   validation with error accumulation. Each task = prompt + tsconfig + (optionally) a reference
   solution. Avoid tasks that are trivially loop-free; imperative temptation must be present.
2. **Context conditions** (the independent variable): `zero-shot` (no functype mention — baseline),
   `instructed` (told to use functype, nothing else), `skill` (quick-reference in prompt),
   `full-docs`, `mcp` (live `validate_code` loop).
3. **Harness:** Anthropic API (batch where possible — 15 tasks × 5 conditions × 3 samples × N
   models adds up), write each solution to a temp project, score with the Phase 1 scorer, and
   record **compile rate** (tsc pass/fail) as a separate column — arguably the more publishable
   number than the fitness score.
4. **Output:** `bench` prints the model × condition matrix (score / compile-rate); `--json` for the
   site. Document the determinism caveat: scoring is deterministic, generation isn't — hence 3
   samples + mean/stddev.
5. **Publish** the results table on the docs site and in the README.

**Gate:** complete workstream 4 first — otherwise the bench bakes in whatever bias
`prefer-either` has today.

## 2. Positioning doc (vs Effect)

**Goal:** a crisp public answer to "why not Effect?". One day of work; highest leverage per hour.

1. Add a **"functype vs Effect"** section to the README + a site page. Frame: *Effect is a runtime
   you marry; functype is a vocabulary you adopt* — the cats/ZIO split. Functype = Scala's standard
   library for TypeScript; Effect = the application framework.
2. State **explicit non-goals** publicly: no fiber runtime, no structured concurrency, no
   Clock/Random/Tracer (promote the Logger rationale already in `packages/functype/CLAUDE.md` to
   public docs), no persistent data structures.
3. Include an honest **"choose Effect when…"** list (structured concurrency, streaming, ecosystem
   mass). The honesty is what makes the rest credible.
4. Lead with the **LLM-native differentiator**: the enforce/measure/teach loop
   (eslint-plugin-functype + functype-eval + MCP server + skill) that no other FP library has.
   Link the bench results once workstream 1 lands.

## 3. Task → IO consolidation

**Goal:** one effect type. Two overlapping effect types ("async with Ok/Err" vs "lazy effects with
typed errors") confuse newcomers and LLMs alike — which directly undercuts the thesis. IO absorbs
Task's unique capabilities; Task becomes a deprecated alias layer, removed in 2.0.

**Phase A — Gap analysis (small, do first).** Inventory what Task has that IO lacks. Believed to be
exactly three things: (1) a *cancellation handle* — `Task.cancellable(fn)` returns
`{ task, cancel }`, whereas IO's `Interrupted` exit exists but there is no public "run and hand me
a cancel function" API; (2) *progress callbacks* (`Task.withProgress`); (3) the eager `TaskOutcome`
Ok/Err value vs IO's lazy effect + `Exit`. Write the inventory up as a one-page decision doc in
`docs/proposals/` — it forces the Phase B design choices to be explicit.

**Phase B — Grow IO (one minor release).**
- `io.runFork(): { exit: Promise<Exit<E,A>>, interrupt: () => void }` — the cancellation handle,
  returning the `Exit` that already exists. (Name it `runCancellable` if fiber connotations should
  be avoided — see non-goals in workstream 2.)
- Progress: an `onProgress` hook on run options, or an `IO.withProgress` combinator. Keep it a
  callback, not a stream — streams are Effect's lane.
- `Exit ↔ TaskOutcome` interop helpers so TaskOutcome-shaped code converts mechanically.

**Phase C — Migrate functype-react (the real consumer).** Build `useIO` / `useIOValue` /
`IOBoundary` on the new IO APIs, mirroring the existing hook shapes. Then reimplement
`useTask`/`useTaskPromise`/`useTaskValue`/`TaskBoundary` as thin wrappers over the IO hooks —
behavior-compatible, so react consumers feel nothing during 1.x.

**Phase D — Deprecate (same minor).** `@deprecated` JSDoc on the Task module pointing at IO
equivalents; migration table in the CHANGELOG; update the full doc surface (feature matrix,
`cli/data.ts`, site content, both skill reference files, MCP server data — the 12-step checklist in
functype's CLAUDE.md is the map). Update the skill so LLMs stop generating Task code immediately —
that acts faster than the deprecation tag.

**Phase E — Remove in 2.0.** Delete `core/task` (−1,062 LOC) and the react wrappers. This is a
major and rides the `ALLOW_MAJOR` flow — exactly what that gate exists for. No date pressure; it
ships when a 2.0 has other cause.

**Open decision:** does `TaskOutcome` survive as the name for the eager result (with `Exit`
internal), or does `Exit` win everywhere? Leaning `Exit` (Scala-aligned), but it's a naming call to
make explicitly in Phase A.

## 4. ESLint rule aggressiveness audit

**Goal:** decide whether functype-os's scores reflect un-idiomatic code or over-aggressive rules —
*before* the bench treats the rules as ground truth.

1. **Corpus:** functype-os's violations (35 `prefer-either`, 31 collections per ~1.1 KLOC). Dump
   with locations via the programmatic ESLint runner already built in functype-eval.
2. **Classify each violation:** (a) *should genuinely be Either/List* → fix the code, possibly
   extracting boundary helpers into functype-os (e.g., `fsTry`, `envOption` wrappers); (b)
   *idiomatic boundary code* (Node API try/catch at the edge, native array handed to a Node API) →
   the rule needs an escape hatch.
3. **Category (b) fixes go in the plugin, not the eval** (per the established anti-pattern:
   detection logic lives in `eslint-plugin-functype`): rule options like `allowAtBoundary` /
   `ignoreCallPattern`, or split `prefer-either` into strict and recommended variants.
4. **Recalibrate functype-eval's `k_d` defaults** against post-audit reality, and publish
   expectation bands: idiomatic functype package ≈ 75+; 50–75 = boundary-heavy; <50 = imperative.
5. **Re-score the family** and put the numbers in each package's README as the dogfood proof.

## 5. Performance honesty

**Goal:** published numbers + explicit non-goals, so nobody discovers the tradeoffs the hard way.
Context: containers are built by constructor functions allocating a fresh method table (~40
closures for List) per instance — no shared prototype — and List is array-backed copy-on-write,
O(n) per operation.

1. **Run the existing `pnpm bench`** and capture: List vs native array for map/filter/reduce chains
   at 1K/100K elements; construction cost; Option overhead vs nullable checks.
2. **Write `packages/functype/docs/performance.md`:** array-backed copy-on-write (not persistent
   structures), per-instance closures, O(n) per op — with guidance: "use functype at the
   domain/service layer; drop to native arrays in measured hot loops; `toArray()` is the escape
   hatch." Link from README.
3. **Optional spike, measure-first:** a shared-prototype List behind the identical interface,
   benchmarked against current. >2× construction win with zero API change → take it; marginal →
   document and close. No optimization ahead of the numbers.
