# Roadmap — post-1.3.x execution plan

_Drafted 2026-06-09, from a full-monorepo review. Five workstreams. Suggested order:_
_**2 → 4 → 1 → 5 → 3**_ _— positioning is a day, the rule audit gates the bench (the bench
inherits rule bias), Task/IO is the long pole and lands across releases._

Dependency graph: **2** standalone · **4 → 1** (hard ordering) · **5** standalone · **3** spans
releases independently.

| #   | Workstream                                | Size | Gates                                 |
| --- | ----------------------------------------- | ---- | ------------------------------------- |
| 1   | functype-eval Phase 2 bench               | M    | after 4                               |
| 2   | Positioning doc (vs Effect)               | S    | —                                     |
| 3   | Task → IO consolidation                   | L    | removal waits for 2.0                 |
| 4   | ESLint rule aggressiveness audit          | M    | —                                     |
| 5   | Performance honesty                       | S    | —                                     |
| 6   | Naming alignment (agent first-guess test) | M    | considerations only; added 2026-10-26 |

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

1. Add a **"functype vs Effect"** section to the README + a site page. Frame: _Effect is a runtime
   you marry; functype is a vocabulary you adopt_ — the cats/ZIO split. Functype = Scala's standard
   library for TypeScript; Effect = the application framework.
2. State **explicit non-goals** publicly: no fiber runtime, no structured concurrency, no
   Clock/Random, no persistent data structures.
   Then state the line separately, in its own paragraph: type-only service interfaces are in
   scope, framework runtimes are not. The reasoning already lives in
   `packages/functype/CLAUDE.md`; promote it to public docs rather than restating it.
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
exactly three things: (1) a _cancellation handle_ — `Task.cancellable(fn)` returns
`{ task, cancel }`, whereas IO's `Interrupted` exit exists but there is no public "run and hand me
a cancel function" API; (2) _progress callbacks_ (`Task.withProgress`); (3) the eager `TaskOutcome`
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
_before_ the bench treats the rules as ground truth.

1. **Corpus:** functype-os's violations (35 `prefer-either`, 31 collections per ~1.1 KLOC). Dump
   with locations via the programmatic ESLint runner already built in functype-eval.
2. **Classify each violation:** (a) _should genuinely be Either/List_ → fix the code, possibly
   extracting boundary helpers into functype-os (e.g., `fsTry`, `envOption` wrappers); (b)
   _idiomatic boundary code_ (Node API try/catch at the edge, native array handed to a Node API) →
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

## 6. Naming alignment: what agents guess first

_Added 2026-10-26. These are considerations for later, approved in direction, not scheduled work.
The 2.0 plan itself stays in #276 (the 2.0 release plan) and #277 (the 2.0 checklist)._

**Why:** functype isn't widely known yet, so what an LLM writes without reading the docs is how many
consumers actually meet it. The doc type-checks added in 1.19 and 1.20 caught about 100 wrong calls in
agent-written docs, many of them names that never existed in functype but do in Effect, Scala or fp-ts.

### Principles

- **OO with Companion.** Per-value operations are instance methods you chain
  (`opt.map(f).getOrElse(() => 0)`, the 2.0 shape). Constructors, guards and multi-value operations live on the
  companion (`Option.from`, `Option.isSome(o)`, `Either.traverse`). Effect and fp-ts are references for
  vocabulary, not for call shape: no data-first statics like `Option.map(o, f)` and no standalone
  `pipe(x, f, g)`. For shape, compare OO-method libraries: Scala, Kotlin, Rust, Java, native JS
  prototypes, Immutable.js, and ts-pattern for builders.
- **A first guess must work or fail to compile.** It must never compile and silently do the wrong thing.
  The compiler catches wrong names and shapes. What it can't catch is an existing name whose behavior
  changes (a swapped return type, a sequential default turning parallel), so those need the upgrade
  tool and runtime tests.

### Kinds of miss, and the policy for each

| Kind         | Example             | Policy                                                                                |
| ------------ | ------------------- | ------------------------------------------------------------------------------------- |
| Name miss    | `list.append(x)`    | the feature exists under another name: a rename candidate                             |
| Shape miss   | `Option.map(o, f)`  | keep it a compile error; fix with docs and a "did you mean" lint rule                 |
| Feature miss | `Try.mapFailure(f)` | decide explicitly; default is don't add, unless it fills a gap across the type family |

### The test

A script under `scripts/`, never in `pnpm validate`: it needs an API key and its results vary.

- **Clean context:** raw Messages API calls outside Claude Code, with a hand-written system prompt. A
  Claude Code subagent inherits the functype MCP server, skill and CLAUDE.md, so it isn't a fresh
  agent. Each run starts by asking the model to list its tools, as a leak check.
- **Fixed signatures with hidden runtime tests**, kata-style. For example, a `fallback(o, compute)`
  task asserts `compute` isn't called on `Some`, and a timed `IO.all` task catches sequential vs
  parallel. Each answer scores as fails to compile, compiles but fails at runtime, or passes. The
  middle count is the one that matters.
- **Task wording by input and output types only.** "Run an IO" or "match on a union" hands over the
  name. Fix tasks, scoring and thresholds before the first run.
- **Sample:** 12–15 tasks × 3 Claude tiers × 5 samples. A name counts only if two tiers miss it.
  Report per-task miss rates, not raw counts.
- **Classify by TypeScript diagnostic:** TS2339 or TS2551 ("did you mean") on an instance type is a
  name miss. On the companion it is a shape miss toward statics only when the name exists on the
  instance type (`Option.map(o, f)`); otherwise it is a name miss (`Try.sucess(1)`). TS2305 or TS2724
  is a missing export. TS2554 or TS2345 is a signature miss. A runtime failure after a clean compile is
  the compiles-but-wrong case. TS2551 matters most: near-miss names such as `getOrElse` on 1.x produce
  it, not TS2339.
- **Three exposure conditions:** zero context; the `.d.ts` pasted in; agentic with compiler feedback.
- Run once on 1.x to build the rename list, and again on the 2.0 API before release. The second run
  checks that no guess moved from "works or fails" to "compiles but wrong".
- Limitation: only Anthropic models, so the result is the Claude prior, weighed against the library
  survey rather than taken as "what agents do".

### Candidates

| Candidate                                                                                                                                                                                                                                  | Status                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| One error-and-tap set on every type: `mapError`, `tap`, `tapError` (Option gains `tap`; Try gains `mapError`, `tapError`)                                                                                                                  | 1.x additive. IO has all three, Lazy has `tap`/`tapError`, and Effect v4 uses `mapError`                                        |
| `either.getLeft()` / `getRight()`, returning `Option`                                                                                                                                                                                      | 1.x additive. Effect v3's returns an `Option` too, so a raw-value guess fails to compile                                        |
| "Did you mean" lint rule, with the same map in the MCP server's `validate_code` (`get` → `orThrow`, `andThen` → `flatMap`/`zipRight`, `mapFailure` → `mapError`, and on Option only `fromNullable` → `from`; `Either.fromNullable` exists) | 1.x additive                                                                                                                    |
| `List.add` → `append`                                                                                                                                                                                                                      | 2.0. List already has `prepend`; Effect uses `append`/`prepend`. `Set.add` stays, matching native `Set`                         |
| `Either.mapLeft` → `mapError`                                                                                                                                                                                                              | 2.0 candidate, so the error mapper has one name everywhere                                                                      |
| Cond `.else` → `.otherwise`, and delete `elseWhen` (it has the same code as `when`)                                                                                                                                                        | 2.0. `.otherwise` follows ts-pattern                                                                                            |
| `Match.default` → `.otherwise`                                                                                                                                                                                                             | test decides; no evidence yet                                                                                                   |
| `exists` → `some`                                                                                                                                                                                                                          | test decides. `some` fits List and Set next to `every`; Effect keeps `Option.exists`                                            |
| `run()` / `runEither()`, as a family with `runSync`                                                                                                                                                                                        | test decides the names. A 1.x `run()` call can't be made to fail to compile, so this relies on the upgrade tool's exact rewrite |
| `getOrElse(() => v)` / `orElse(() => opt)`, lazy only                                                                                                                                                                                      | decided in #276 §2; a positive control for the test                                                                             |
| Variadic `Tuple(a, b)`                                                                                                                                                                                                                     | dropped: an old `Tuple([1, 2])` would compile as a tuple holding one array. `Tuple.of(1, 2)` already exists                     |
| `Option.get()`, `IO.andThen`, data-first statics, a standalone `pipe`                                                                                                                                                                      | don't add. `map.get(k).get()` would read naturally and be the unsafe path                                                       |
| `Task.sync`                                                                                                                                                                                                                                | moot: Task is deleted in 2.0 and `IO.sync` replaces it                                                                          |

### Effect v4 renamed `Either` to `Result`

Effect's v3→v4 migration guide renames every `Either` API, with no alias: `Left`/`Right` →
`Failure`/`Success`, `isLeft` → `isFailure`, `mapLeft` → `mapError`, `getLeft` → `getFailure`,
`fromNullable` → `fromNullishOr`. v4 shipped as 4.0.0 on 2026-10-01, and v3 continues on npm's `prev` tag. functype keeps `Either`; the
test should include an Either task to see whether agents start guessing `Result`.

### Raised in the 2.0 review, undecided

- **Sibling peer floors.** On `main`, functype-os, functype-react and functype-log accept old cores
  (`>=1.13.0`, `>=1.14.0`, `>=0.60.0`), and functype-os and functype-react call the methods #276 §2
  renames (`.or(…)`, `.orElse(…)`). Raise every peer floor to
  `>=2.0.0` at the cut, and consider a `check-publish-safety` check that peer floors match the
  family's major.
- **One Node floor.** The packages disagree: none, `>=18.17.0` and `>=20.20.0`. `AbortSignal.any`
  needs Node 20.3 or later, so any 20.x floor at or above that lets `src/internal/signal.ts` (its
  stand-in) go.
- **Serialized errors.** `Try` serializes an `Error` with name, message and stack; `Either`, `Option`
  and `List` serialize it as `{}`. Unifying them changes the wire format, so it's a 2.0 change, and the
  `stack` field needs a decision because it can leak file paths.
