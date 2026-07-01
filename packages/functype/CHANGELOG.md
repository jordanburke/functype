# Changelog

This CHANGELOG covers the 6-package functype family (`functype`, `functype-os`, `functype-log`, `functype-react`, `functype-eval`, `functype-mcp-server`) — all bumped together. The eslint pair (`eslint-config-functype`, `eslint-plugin-functype`) mirrors functype's version line per the encoding in `docs/RELEASE.md` and ships in lockstep.

Entries follow [Keep a Changelog](https://keepachangelog.com/) conventions: write notes under `## Unreleased` as you land changes, and `pnpm release patch|minor|major` cuts that section into a dated version header when you cut a release.

## Unreleased

## 1.6.0 - 2026-07-01

**`functype` — value-driven effect repetition on `IO`: `repeatUntil`, `repeatWhile`, `IO.iterate`.**

Adds the value-channel dual of the existing `retry*` family. `retry*` re-runs the effect while it keeps failing; the new combinators re-run while its _successful output_ hasn't yet met a predicate. Both axes compose — a poll can retry on transient network errors _and_ keep repeating until the payload is ready.

- `io.repeatUntil(done, { max, delayMs? })` — re-run until `done(a) === true`.
- `io.repeatWhile(cont, { max, delayMs? })` — symmetric sibling; re-run while `cont(a) === true`.
- `IO.iterate(seed, step, done, { max? })` — stateful effectful loop threading `S` through an effectful `step` until `done(state)` holds. `done(seed)` is evaluated before the first step, so an already-satisfied seed returns immediately. `max` defaults to `10_000`.
- New tagged error `RepeatExhausted<A>` (with `_tag`, `max`, `lastValue`) surfaces in the `E` channel when the bound is reached before the predicate is satisfied — no hangs, no untyped throws.

Exhaustion is bounded by construction: `max` is required on `repeatUntil` / `repeatWhile`, defaulted on `iterate`. Implementations are stack-safe via the existing IO trampoline (verified over 100k iterations). Closes #219.

A composable `Schedule<In, Out>` value type — unifying retry and repeat under one algebra — is tracked separately as a new `functype-schedule` package and gated on ≥2 real consumers (see #220).

## 1.5.0 - 2026-06-22

**`functype` — add `filterOrElse(predicate, onUnsatisfied)` to `Try` and `Either`.**
Turn a value-level guard into a typed failure without writing a manual `throw` inside a `Try(() => …)` body or breaking the chain with an `if/return Left(...)` ladder.

- `Try<T>.filterOrElse(p, (v) => Error)` — Success with passing predicate stays Success; Success with failing predicate becomes Failure carrying the constructed Error; Failure passes through unchanged (predicate never runs). A throwing predicate surfaces as Failure.
- `Either<L, R>.filterOrElse<L2>(p, (v) => L2): Either<L | L2, R>` — Right with passing predicate stays Right; Right with failing predicate becomes `Left(onUnsatisfied(value))` and widens the Left channel to `L | L2`; Left passes through unchanged.

Direct namesake of Scala's `Either.filterOrElse`. Closes #208.

## 1.4.4 - 2026-06-20

**Security: `functype-mcp-server` — fix unauthenticated RCE via `set_functype_version` (GHSA-wcjj-9m6g-2fr2).**
Credit: [@EQSTLab](https://github.com/EQSTLab) (CVSS 7.8 High, CWE-829).

The `set_functype_version` MCP tool accepted an unconstrained `version` string, interpolated it into `functype@<version>`, and passed the result to `pnpm add`. pnpm honors `file:`, `npm:`, `git+`, and URL alias syntaxes, so an attacker who could call the tool — including via indirect prompt injection in an agent context — could install an arbitrary local or remote package as `functype`. The server then dynamic-imported `functype/cli` from the freshly-installed package, executing attacker-controlled code in the MCP server process.

Three changes:

- **Input validation.** `version` is now matched against a strict regex (semver with optional `~`/`^`/`v` prefix and prerelease/build metadata, or the dist-tags `latest`/`next`/`beta`/`alpha`/`canary`/`rc`). Any `:`, `/`, `\`, `@`, or whitespace is rejected — `file:`, `npm:`, `git+`, and URL aliases are refused before they reach pnpm.
- **`--ignore-scripts`.** The `pnpm add` invocation now passes `--ignore-scripts` as defense in depth, so a malicious npm-published version (one that passes the regex) cannot run lifecycle scripts on install.
- **Transport gating.** `set_functype_version` is only registered when `TRANSPORT_TYPE=stdio` (the default). Over `httpStream` the tool is not exposed at all — an unauthenticated network caller can no longer downgrade the installed `functype` to a vulnerable version.

**Hardening: `functype-mcp-server` HTTP transport defaults to loopback.**
The HTTP listener previously defaulted to `HOST=0.0.0.0`, so enabling `TRANSPORT_TYPE=httpStream` silently bound the server to every interface. The default is now `127.0.0.1`; set `HOST=0.0.0.0` explicitly to bind publicly (and front it with auth).

## 1.4.3 - 2026-06-16

**`eslint-plugin-functype` — fix `prefer-try` false positives and dropped-finally autofix on `try` with a finalizer.**
Two related bugs around `try` statements with a `finally` block:

- Catch-less `try { } finally { }` triggered a misleading "Prefer `Try(() => …)` over try/catch block" warning despite having no catch to lift, because `context.report` ran unconditionally after the autofix gate.
- `try { } catch { } finally { }` could pass the autofix gate, with the suggestion `return Try(() => body)` silently dropping both the catch _and_ the finally — defensive code becomes broken code on a single keypress.

Fixed by a single guard at the top of the `TryStatement` handler: `if (node.finalizer) return`. `Try` cannot model `finally` — the FP primitive for guaranteed cleanup is `IO.bracket`, on the lazy IO type. Plain `try { } catch { }` (no finalizer) still fires as designed. Closes #206.

## 1.4.2 - 2026-06-16

**`eslint-plugin-functype` — fix `prefer-do-notation` false positives on monad conversions.**
The `preferDoForMixedMonads` check was firing on any `CallExpression` whose AST subtree contained
≥2 distinct monad constructor names, conflating conversion shapes like
`Try(...).fold(() => Option.none(), v => Option(v))` with actual composition. Now gated on a
composition-chain test (`.flatMap`/`.map`/`.filter` stacked ≥2 deep); terminal handlers like
`fold`/`match`/`getOrElse` and bare co-occurrence in arg lists no longer trip the rule. Closes #205.

**Build reliability — rolldown renamer guard removed; `Logger` restored to top barrel.**
The non-deterministic chunk-splitter / renamer race that prompted the 1.3.1 build-guard and the
subpath-only `Logger` workaround appears to be fixed upstream in rolldown 1.1.1 (which tsdown's
`~1.1.0` constraint now resolves to). Last 10 main CI runs all reported `[build-guard] clean on
attempt 1`; local determinism harness reports 0/20 unloadable under `RAYON_NUM_THREADS=4`.

- `packages/functype/scripts/build-verified.mjs` and `scripts/check-build-determinism.mjs` removed;
  `package.json` `build` restored to `ts-builds build`.
- `packages/functype/src/index.ts` restores `export type { Logger } from "@/logger/Logger"`.
  `import type { Logger } from "functype"` works again, in addition to the `functype/logger` subpath.
- In-repo consumers (`functype-os/config/bootDiagnostics.ts`, `consoleBootLogger.ts`, the
  boot-diagnostics spec) flipped back to top-barrel imports for consistency with the rest of the
  workspace.

Closes #182 (moot — no upstream repro needed). Closes #179.

## 1.4.1 - 2026-06-14

**`eslint-plugin-functype` — split `prefer-either` try/catch handling into new `prefer-try` rule.**
The old `prefer-either` rule's `TryStatement` handler reported "Prefer `Either<Error, T>`" while
its autofix produced `Try(() => …)` — the message and the fix had been disagreeing since the day
the handler was written. The fix was right; the branding was wrong, and the underlying conceptual
model was too: a raw `try/catch` is "run a computation that may throw" (that's `Try`), while
`Either<E, A>` earns its keep when you _choose_ `E` (typed domain error). The cleanest reflection
is two rules.

- **New rule: `functype/prefer-try`** — owns try/catch. Reports `preferTryOverTryCatch` ("Prefer
  `Try(() => …)` over try/catch block"). Autofix suggests `Try(() => …)` for sync return bodies
  and `Try.fromPromise(…)` for `return await x` bodies. Re-throw-in-catch escape hatch preserved.
- **`functype/prefer-either` narrowed** — keeps `ThrowStatement` → `Either.left(…)` and
  function-return-type checks (`preferEitherReturn`); no longer reports on `try/catch`. Description
  updated to "Use `Either`/`Left`/`Right` for typed domain errors instead of throwing."
- **`recommended` and `strict` configs add `prefer-try` automatically** — consumers on those configs
  see no change in warning count, only the rule name in the warning line changes for try/catch.
- **Migration for custom-config consumers**: if your `.eslintrc` explicitly lists
  `"functype/prefer-either"`, add `"functype/prefer-try"` alongside it to retain try/catch coverage.

Closes #198.

## 1.4.0 - 2026-06-13

**`functype-os` — internal FP cleanup; two breaking type changes.** All 58 lint warnings in the package are gone, fixed at the source rather than silenced:

- `Fs.ts` — 23 `try/catch` blocks replaced with `Try(thunk).toEither(buildErr)` (sync) and `Try.fromPromise(promise)` (async). Same runtime behavior; the FP type tells the story instead of a control-flow keyword.
- `Platform.ts` — all `try/catch` replaced with `Try`. `new Set([...])` swapped for `Set.of(...)`. Imperative for-of loops replaced with `flatMap` / `forEach` chains.
- `ConfigResolver.ts` + `bootDiagnostics.ts` — imperative for-of loops replaced; deep `List.map → flatMap → find` chains broken into a single helper (`presentPaths`) so they stay under the `prefer-do-notation` chain-depth threshold.
- `Env.ts` — `Option(x).fold(Left, Right)` collapsed to `Option(x).toEither(left)`. `try { parser(v) }` replaced with `Try(() => parser(v)).toEither(buildErr)`.
- `PathExpander.ts` — regex callback captures now lifted into `Option` instead of `string | undefined ?? ""`.
- `colors.ts` — removed an unnecessary optional chain that the TS strict checker flagged.
- `eslint.config.mjs` — turned off the `prefer-do-notation` rule's `detectMixedMonads` heuristic with an inline rationale. That sub-check is text-based and false-positives on idiomatic conversions (`Try.toEither`, `Option.toEither`, `Try.toOption`) which are the _recommended_ way to cross monad boundaries. The chain-depth sub-check (the genuinely useful one) stays on.

Breaking (TS-visible only):

- `ProcessError.exitCode: number | null` → `Option<number>`. Constructor now takes `Option<number>`. Consumers reading the field directly need `.fold(...)` / `.orElse(default)`.
- `UserInfo.shell: string | null` → `Option<string>`. Same migration.

Both fields were added in 1.3.x's `Process` and `Platform` modules — they're brand-new public surface that's only had one minor release of exposure. The breakage is mechanical (`x.exitCode === null` → `x.exitCode.isEmpty`, `x.shell ?? ""` → `x.shell.orElse("")`) and consistent with how the rest of `functype-os` models nullables.

**New package: `functype-eval`.** A CLI that scores a TypeScript codebase's functype/FP adherence as
a 0–100 fitness number with a per-dimension breakdown. It runs `eslint-plugin-functype`'s 12 rules via
the ESLint Node API, plus `type-coverage-core` and a ts-morph non-null-assertion scan, and aggregates
them by violation density. `functype-eval score <dir>` supports `--json` and `--threshold N` for CI
gating; `bench` (the Phase 2 LLM eval harness) ships as a stub. Joins the family release line (1.x).

**`functype-eval` empty-input guard.** `score` on a directory with no TypeScript sources no longer
prints a misleading `100/100` (0 LOC trivially scores every density dimension 1.0). It now reports
"no TypeScript sources found" and exits `2` (distinct from `1` = below `--threshold`). `ScoreResult`
gains a `fileCount` field so library callers can detect the same condition.

**`functype` — three additive API surface additions, no breaking changes.**

- **`Option.toEither(E | (() => E))`** — the existing eager form (`toEither(left)`) still works; the new thunk form (`toEither(() => buildLeft())`) defers Left construction until the None path actually fires. Useful when the Left value is expensive or carries context (e.g. `toEither(() => EnvError(name, msg))`). Mirrors the shape `Try.toEither` already supported.
- **`Try.async(() => Promise<T>)`** — lazy thunk variant of `Try.fromPromise(promise)`. `fromPromise` takes an already-started Promise; `Try.async` takes a thunk so creation can be deferred until wrapping. Synchronous throws from inside the thunk become `Failure` the same way async rejections do — making the wrapper safer for code paths where the producer might throw at promise-creation time.
- **`Option.toArray()` and `Try.toArray()`** — direct readonly-array conversion methods symmetric with the existing `toList()`. Some/Success → `[value]`, None/Failure → `[]`. Eliminates the `fold(() => [], v => [v])` boilerplate for the common "use this Option/Try as 0-or-1 array elements" pattern.

CLI metadata (`src/cli/data.ts`) updated to surface the new methods. As a related fix, the Either / Try check-method entries now show parens (`.isLeft()`, `.isSuccess()`) — these have always been type-guard methods, not properties, but were listed without parens in the API reference; removed a stale `.isDefined` entry that never existed in `Option.ts`.

**`functype` MCP server — type registry reconciliation.**

`get_type_api("TaskOutcome")` returned "not found" while simultaneously listing `TaskOutcome` in the available-types message — two underlying registries (`cli/data.ts` TYPES, `cli/full-interfaces.ts` FULL_INTERFACES) had drifted apart. Fix:

- Added curated TYPES entries for `TaskOutcome` and `TaskResult` (both public surface; previously only one of the two registries knew about them).
- Both added to the "Effect" category in the overview.
- The MCP server's "Available types:" error message now reads from TYPES (the source it can actually answer queries from), not FULL_INTERFACES — eliminates the "listed but not findable" mismatch.

**`eslint-plugin-functype` — two false-positive classes fixed.**

Both surfaced while making functype-os lint-clean. The rules were firing on the package's own recommended conversion patterns.

- **`prefer-do-notation` mixed-monad detection** was a text substring scan: any expression whose source contained 2+ of `{"Option", "Either", "Try", "Task"}` triggered the warning — including the _method names_ themselves (`.toEither` contains "Either", `.toOption` contains "Option"). Idiomatic conversions like `Try(...).toEither(buildErr)` always fired. Replaced with AST-aware constructor-call detection: walks the expression looking for distinct monad _constructor_ calls (`Option(...)`, `Either.right(...)`, etc.). Method calls no longer count.
- **`prefer-flatmap` array-returning gate** was flagging any `.map(cb => array)` regardless of the receiver type — including non-collection monads where `.flatMap` expects `Try<T>`/`Option<T>` etc., not an array. Added a receiver-shape gate: when the `.map` receiver is unambiguously a non-collection monad constructor (`Try(...)`, `Option(...)`, etc.), the rule suppresses. Bare identifiers and array literals still fire as before (we don't have type info to disambiguate those).

The eslint pair version bump per the family mirror encoding: `eslint-plugin-functype` and `eslint-config-functype` move from `2.103.x` to `2.104.0`.

**Workspace tooling.**

- All 7 application/library packages in the family (`functype-os`, `-log`, `-react`, `-eval`, `-mcp-server`, `eslint-plugin-functype`, `eslint-config-functype`) now enforce `eslint src --max-warnings 0` in their `lint:check` scripts — any new warning fails CI on those packages. Same discipline applied across the family; consistent regression gate.
- `functype` core does **not** enforce 0 warnings. ~half of its ~170 warnings live in code that IS the implementation of the pattern being checked (`do/index.ts` is the do-notation runtime; `list/List.ts` contains the iteration that `no-imperative-loops` would forbid). Suppressing via per-glob eslint overrides would destroy useful signal. The count is tracked as a health metric instead — see the new "Lint policy" section in `packages/functype/CLAUDE.md` and the extended Design Philosophy comment in `packages/functype/eslint.config.mjs`. For a richer weighted version, run `functype-eval score packages/functype/src`. (CI integration of that metric over time is tracked in issue #197.)
- `eslint-plugin-functype` internals canonically refactored to FP shape (pure recursion over the AST, immutable Set returns, `Object.entries().filter().flatMap()` patterns replacing for-loops + mutable accumulators). Native primitives throughout — no functype runtime dep added. Same external behavior, same test coverage (181 tests).
- Turbo task graph: `lint:check` and `validate` now declare explicit `dependsOn` on `eslint-plugin-functype#build` and `eslint-config-functype#build` so CI on a fresh checkout doesn't race the workspace-linked eslint plugin's dist.

## 1.3.1 - 2026-06-06

**`exports` subpaths now all build (#180):**

12 of the 24 advertised `exports` subpaths — `functype/conditional`, `/decoder`, `/lazy`, `/task`, `/io`, `/functype`, `/typeclass`, `/obj`, `/companion`, `/serialization`, `/util`, `/fetch` — resolved to `dist/*/index.js` files that were never emitted (only the modules in `tsdown.config.ts`'s entry list were built), so importing any of them failed with `ERR_MODULE_NOT_FOUND`. They now build and resolve. The 12 already-working subpaths and the top-level barrel are unchanged. `tsdown.config.ts` now lists entries explicitly, so a published subpath can't silently drift out of the build again.

**Build reliability — rolldown renamer guard:**

functype's build now retries until every emitted entry actually loads (`scripts/build-verified.mjs`), working around the non-deterministic rolldown 1.1.0 chunk/renamer bug described below so a broken bundle can't ship. Tooling-only — no change to published artifacts. (Workspace also moved to pnpm 11 + ts-builds 3.0.0; dev-only.)

**Logger location — temporarily subpath-only (1.3.x):**

Source-only change (no version-bumped artifact): `Logger` is no longer re-exported from the top-level `functype` barrel. Use the `functype/logger` subpath:

```ts
import type { Logger } from "functype/logger"
```

The 1.3.0 published dist on npm has `Logger` reachable from both paths (it was emitted on a "good" rolldown chunk run). Going forward, code that lives in this repo and code that ships in subsequent 1.3.x releases will reach Logger via the subpath only.

**Why:** rolldown 1.1.0 (the bundler tsdown uses under the hood) has a non-deterministic chunk-splitter bug. Re-exporting `Logger` from the top barrel made the rolldown chunk graph dense enough that ~30% of builds emitted `src-*.js` chunks referencing `Companion$N` without a matching definition — `import { IO } from "functype"` would crash with `ReferenceError` at module-evaluation time in downstream consumers (functype-log tests, anywhere). The published 1.3.0 happened to land on a clean build; CI on the same commit hit the broken case. Multiple source-level workarounds (`export * from "@/logger"` → `"@/logger/Logger"`, then `export *` → `export type`) reduced the trigger rate but didn't eliminate it.

**Restore plan:** track rolldown chunk-splitter determinism issues at https://github.com/rolldown/rolldown — file one with a minimal repro if no matching issue exists. Once a fixed rolldown ships, restore the `export type { Logger } from "@/logger/Logger"` line in `packages/functype/src/index.ts` and the `import type { Logger } from "functype"` form in `functype-os/config` / docs / skills. Parity with every other functype type is the target end state.

**Migration for in-repo callers:** the change is mechanical — `import type { Logger } from "functype"` → `import type { Logger } from "functype/logger"`. Already applied to `packages/functype-os/src/config/bootDiagnostics.ts`, `consoleBootLogger.ts`, and `test/config/boot-diagnostics.spec.ts`. Existing consumers on 1.3.0 who imported from the top barrel can keep doing so — their installed artifact carries both paths.

## 1.3.0 - 2026-06-03

Polish on the 1.2.2 type export: `JSONValue` is now reachable two ways — `Serialization.JSONValue` (via the namespace, as before) AND `import type { JSONValue } from "functype"` (top-level, new). Type-only re-export from the serialization barrel — safe across the import cycle that prevents value-level re-exports of the `Serialization` namespace from that path. Conformance suite gains a compile-time assertion that both paths resolve to the same type.

**HTTP production-readiness (targeted at 1.3.0 alongside the config-coordination proposal):**

`functype/fetch` was functionally complete on the happy path but lacked the operational surface every real client hits in the first week. This release closes those gaps — all backward-compatible, no signature drift on existing methods.

- **`IO.retryWhile({ n, while, delayMs? })`** — predicate-based retry. Only retries when `while(error, attempt)` returns true. The `attempt` argument is 1-indexed. Lets you write "retry network blips and 5xx, never 4xx" as a single call.
- **`IO.retryWithBackoff({ n, baseMs, maxMs?, factor?, jitter?, while? })`** — exponential backoff with optional full jitter (50–100% of the computed delay, prevents thundering herd) and predicate gating. Defaults: `factor=2`, `maxMs=30_000`, `jitter=true`, `while = () => true`.
- **`HttpClientConfig.afterResponse`** — symmetric with `beforeRequest`. Effectful transformer `(HttpResponse<unknown>) => IO<never, HttpError, HttpResponse<unknown>>` that runs after the response is parsed and the decoder (if any) succeeds. **Success path only** — `HttpStatusError`, `DecodeError`, `NetworkError` skip the hook and surface directly. Use `.catchTag` / `.tapError` for error-side observability. Refresh-on-401 is a `.catchTag` pattern, not an `afterResponse` pattern (documented).
- **`HttpRequestOptions.params` / `HttpMethodOptions.params`** — typed query record (`HttpQueryParams` exported from `functype/fetch`). `undefined` / `null` values dropped, arrays repeat the key (`{ tag: ["a", "b"] }` → `tag=a&tag=b`), special chars percent-encoded via `URLSearchParams`. Merges with any query string already in the URL.

**Out of scope (owned by the 2.0 plan in `docs/proposals/http-wire-format-2.0.md`):** removal of the deprecated `validate` field, `encode?` per-call hook + `Encoder<A>` type alias, `Decoder.fromZod` adapter package.

**Config coordination + core `Logger` interface (1.3.0, per `docs/proposals/config-coordination-1.3.md`):**

Every functype-backed service rewrites the same boot-time pattern: load env vars, fetch secrets, merge with defaults, log a diagnostic block with masking + env-mismatch + fail-fast. This release ships the contract + composition + standardized diagnostics. No third-party SDK shipped from functype — `ConfigSource` IS the plugin point.

- **`Logger` interface** — minimal 4-method type (`debug`/`info`/`warn`/`error`), type-only, no implementation. Reachable from the top-level `functype` barrel (the convention every other functype type follows) as well as the dedicated `functype/logger` subpath for users who prefer narrow imports. Common shape every present and future sibling package can reference. `DirectLogger` from `functype-log` structurally satisfies `Logger` — no adapter required. If a consumer already has a local `Logger` type, rename on import via `import type { Logger as FunctypeLogger } from "functype"`.
- **`functype-os/config` extended** — adds multi-source coordination + boot diagnostics alongside the existing `ConfigResolver`:
  - **`ConfigSource`** — interface `{ name: string, get(key): Option<string> }`. Any value matching this shape (env, vault, defaults, file-based, user-written adapter) is a `ConfigSource`.
  - **`ProcessEnvSource()`** — wraps existing `Env` (process.env).
  - **`StaticSource(entries, name?)`** — in-memory map source for defaults / test fixtures.
  - **`Layered([sources])`** — first-wins composition over N sources via `Option.isSome()` short-circuit. Composed `name` reflects the resolution chain (`"process.env > infisical > defaults"`).
  - **`consoleBootLogger`** — default `Logger` impl, raw ANSI colors, zero-dep, respects `NO_COLOR` / `FORCE_COLOR` / `process.stdout.isTTY`.
  - **`maskValue(s)`** — short values → `"****"`, longer → `"ab****yz"`. Exported for ad-hoc masking.
  - **`bootDiagnostics({ source, required, sensitive, public, hostEnv, vaultEnvKey, failOn, logger, serviceName })`** — returns `Either<List<MissingKey>, void>`. Always logs the standardized block (header → masked sensitive → raw public → optional env-mismatch). `failOn: "missing"` calls `process.exit(1)` when required keys are absent (production guard); default is `"never"` and returns `Left`.
- **Out of scope:** vault SDK adapters (Infisical/Doppler/Vault/AWS Secrets Manager/1Password) — user-written ~12-line adapters or community packages satisfying `ConfigSource`. `DotenvSource` — `dotenv` is a known package; `import "dotenv/config"` at boot and `ProcessEnvSource()` picks up the values.

**`functype-log` — `createConsoleLogger` / `createDirectConsoleLogger` gain `stream` + `console` options for stdout-as-protocol consumers:**

Latent footgun: the previous shape always passed the global `console` to `loglayer`'s `ConsoleTransport`, which routes `info` / `debug` to `console.info` / `console.debug` (stdout) and `warn` / `error` to stderr. For consumers where stdout is a reserved data/protocol channel — most notably MCP-over-stdio servers, where stdout exclusively carries JSON-RPC — every `logger.info(...)` silently corrupted the protocol. A real incident: `somamcp.createConsoleTelemetry` → `createDirectConsoleLogger` → `console.info` → stdout → MCP client (Claude Desktop) saw non-JSON bytes and disconnected. There was no escape hatch in the library; downstreams had to bypass the factory entirely.

Fix is additive, backward-compatible:

- **`stream?: "stdout" | "stderr"`** on `ConsoleLoggerOptions`. Default `"stdout"` — matches current behavior and the convention of every other Node logging library (pino, winston, bunyan). `"stderr"` routes ALL levels (info/debug/warn/error/trace) through `console.error` so stdout stays clean.
- **`console?: Partial<Console>`** on `ConsoleLoggerOptions`. Fully override the sink — file streams, structured collectors, anything matching the subset of `Console` that loglayer's `ConsoleTransport` calls. Takes precedence over `stream`.
- `createDirectConsoleLogger` forwards both options to `createConsoleLogger` (one-line bridge, picks up the new fields for free).

Default behavior is **unchanged** — only consumers who explicitly pass `stream: "stderr"` or `console: customSink` see different routing. Downstream coordination: `somamcp.createConsoleTelemetry` will pass `stream: "stderr"` (ideally as its OWN default — every MCP-stdio server has the same constraint).

No runtime change to existing APIs. No release cut now — lands when 1.3.0 ships.

## 1.2.2 - 2026-06-01

Type-tightening on `toEnvelope` output (and new `JSONValue` type export) so the DBOS / SuperJSON consumer recipe slots in with zero casts at the boundary. Asymmetric by design — only the OUTPUT tightens; `fromEnvelope`'s input stays `unknown` to preserve Postel's law (be conservative in what you send, liberal in what you accept — same pattern stdlib uses for `JSON.parse`/`stringify`, `Array.from`, etc.). Tightening the input too would push casts up the chain to every less-typed host plumbing layer for no runtime benefit.

**New (additive):**

- `Serialization.JSONValue` — exported recursive type: `string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue }`. The canonical JSON value type — anything `JSON.parse` can return and anything `JSON.stringify` can accept. Used by `toEnvelope` to express its output contract precisely.

**Type-only change (no runtime change, no breaking change):**

- `Serialization.toEnvelope(value: unknown): JSONValue` — output type tightened from `unknown` to `JSONValue`. Consumers wiring `serialize: Serialization.toEnvelope` into a host serializer (DBOS / SuperJSON custom transformer) whose hook expects a JSON-shaped return can now slot it in without a boundary cast.
- `Serialization.fromEnvelope(envelope: unknown): Try<unknown>` — **unchanged**. Input stays `unknown` (the deliberate asymmetry — see above).

## 1.2.1 - 2026-06-01

Post-1.2.0 conformance review (civala PDOS engine, which nests functype values inside DBOS durable-workflow checkpoints via SuperJSON) verified that 1.2.0's universal codec is correct and complete — all 12 Serializable types round-trip with methods intact, the `@functype` marker dispatches without Effect/fp-ts collision, malformed input returns `Failure` instead of throwing. This patch lands the one small enhancement that surfaced + two doc clarifications. None block 1.2.0 adoption; consumers can drop their inline shims once 1.2.1 ships. See `docs/archive/proposals/serialization-1.2.1-followups.md`.

**New (additive):**

- `Serialization.toEnvelope(value: unknown): unknown` — serialize to a parsed JSON shape (object/array/primitive) instead of a string. The driving use case is nesting functype values inside another _structured_ serializer whose custom-transformer hook expects JSON values, not strings — SuperJSON (which DBOS's `DBOS.registerSerialization` calls underneath) re-walks the transformer's output and explodes a string return character-by-character into `{"0":"{","1":"\"",...}`, destroying the round-trip. With `toEnvelope` the consumer recipe is shim-free; previously they had to inline `JSON.parse(Serialization.serialize(v))`.
- `Serialization.fromEnvelope(envelope: unknown): Try<unknown>` — inverse of `toEnvelope`. Equivalent to `deserialize(JSON.stringify(envelope))` but bypasses the stringify/parse roundtrip; the same `revive` walker is applied directly to the parsed JSON. The four functions form a clean algebraic square: `serialize ≡ JSON.stringify ∘ toEnvelope`, `deserialize ≡ fromEnvelope ∘ JSON.parse`.
- `Serialization.deserializeStrict(json: string): Try<unknown>` — strict variant of `deserialize` that returns `Failure` when the parsed JSON doesn't carry an `@functype` marker at the top level. For API/queue/RPC boundaries where the wire format MUST be a functype value and silent pass-through would be a bug. (Implemented as a peer function, not a `{ strict: true }` flag — keeps the one-function-one-purpose convention.)

**Docs (no behavior change):**

- `deserialize`/`serialize` JSDoc clarified: both are described as a **lenient** JSON codec that additionally round-trips functype values. Valid JSON without an `@functype` marker is returned verbatim as `Success(value)` (pass-through); only malformed JSON or unknown markers yield `Failure`. The pass-through is what makes mixed structures work — a step return like `{ user: "alice", score: Right(42) }` round-trips with `user` as a plain string and `score` as a functype `Either` instance.
- `Serialization` namespace docs note the algebraic-square relationship so the four functions read as a coherent set rather than two pairs.

**Tests:**

- Conformance suite gains 17 cases covering: `toEnvelope`/`fromEnvelope` shape + nested reconstruction + algebraic-square laws + a structured-serializer simulation (mimics the SuperJSON/DBOS custom-transformer protocol without depending on those packages — proves the contract that broke with the string API works with the envelope API); `deserializeStrict` semantics on marked envelopes, Effect/fp-ts-shaped lookalikes, primitives, plain objects, and malformed input. Total suite: 1708 → 1725.

**Out of scope (still):**

- A `strict` parameter on `deserialize` itself (deliberately rejected — boolean flags on option objects are a code smell for "this should be two functions"; `deserializeStrict` is the peer).
- Custom Error subclass deserialization via a registry — still deferred.
- YAML/binary universal deserializers — still per-type only.
- Streaming/chunked decoders — still value-in/value-out.

## 1.2.0 - 2026-06-01

Universal-deserialize: a single top-level `Serialization.deserialize(json)` that walks parsed JSON and reconstructs any functype value it encounters — no type argument required by the caller. Closes the asymmetry where 1.1.0 had uniform `serialize()` across all 12 Serializable types but reconstruction required either per-type companions (`Either.fromJSON`, etc) or a caller-supplied `reconstructor`. Drives the DBOS durable-workflow integration (every functype value embedded in a step return survives the JSON round-trip with methods intact); applies to any persistence/RPC boundary that hands you an opaque JSON string and expects a value back.

**New (additive):**

- `functype/serialization` module: top-level `Serialization` namespace exposing the universal API.
  - `Serialization.serialize(value): string` — convenience wrapper over `JSON.stringify`. Functype instances self-stringify via their instance `toJSON()` method, so nested functype values inside plain objects and arrays serialize correctly via the standard JSON `toJSON` protocol with no walker needed.
  - `Serialization.deserialize(json): Try<unknown>` — parses, then walks the result rebuilding any object that carries the `@functype` marker via per-type reconstructors. Plain JSON values walk through unchanged. Strict policy on unknown markers (returns `Failure`, never silently treats foreign data as functype). Returns `Try` so malformed input is an expressible value rather than a throw — matches the functype convention.
  - `Serialization.isFunctypeValue(v): v is Serializable<unknown>` — runtime guard for host serializer integrations (e.g. `isApplicable` in a DBOS recipe).
- `Serialization.SerializedError` + `serializeError(unknown)` + `deserializeError(SerializedError | string)`: canonical Error projection used by every Serializable type that carries an `Error` in its failure branch (Try.Failure, Task.Err, Lazy-with-thrown-thunk). Round-trips `name`, `message`, `stack`, and the full `cause` chain (recursively). `e.name === "TypeError"` works after round-trip; `instanceof TypeError` does not (JSON can't reconstruct user-defined classes without arbitrary code execution).
- Every Serializable type now has an instance-level `toJSON()` method returning the marker-bearing envelope **object** (not a pre-stringified string). Native `JSON.stringify` picks it up via the standard protocol; nested functype values self-stringify recursively for free. The `Serializable<T>` interface (`@/serializable/Serializable`) now requires `toJSON(): SerializableEnvelope` alongside `serialize()`.
- New per-type `fromJSON` companions: `Tuple.fromJSON`, `LazyList.fromJSON`, `Lazy.fromJSON`, `Task.fromJSON`. Together with the existing eight, every Serializable type can now be reconstructed standalone.
- New `Lazy.evaluated<T>(value)` constructor — companion to `Lazy.fromValue` with naming that reads as "Lazy whose thunk was already forced." Used internally by `Lazy.fromJSON`; available for any caller who wants to construct an already-resolved Lazy.

**Envelope format change (`@functype` marker):**

Every functype envelope now carries a namespaced marker stamped at the top:

```jsonc
// 1.1.0:
{ "_tag": "Right", "value": 5 }
// 1.2.0:
{ "@functype": "Either", "_tag": "Right", "value": 5 }
```

The marker is the **type** discriminator; `_tag` remains the **variant** discriminator (Right vs Left, Some vs None, etc.). Both are kept across the board — variant-less types repeat the type name as `_tag` for back-compat with 1.1.0 readers that did `parsed._tag === "List"`.

Required because Effect and fp-ts use **identical** `_tag` strings as functype (`"Some"`/`"None"`, `"Left"`/`"Right"`, `"Success"`/`"Failure"`). A bare-`_tag` dispatcher could silently rebuild an Effect `Option` as a functype `Option` — the marker makes the value unambiguously functype's. (Same defense SuperJSON, DBOS, and other persistence-layer serializers use.) The collision blast radius is real, not theoretical: 1.1.0 already serialized envelopes that overlap exactly with Effect's wire format.

Migration: minimal — the envelope is additive. Existing readers that check `_tag` keep working. Code that asserts exact envelope strings (test fixtures, debug logs) needs a one-line update to include `"@functype"`.

**Behavior change — `Try.Failure` and `Task.Err` envelope shape:**

Both now carry a structured `SerializedError` object instead of flat string fields:

```jsonc
// Try.Failure 1.1.0:
{ "_tag": "Failure", "error": "msg", "stack": "..." }
// Try.Failure 1.2.0:
{ "@functype": "Try", "_tag": "Failure", "error": { "name": "TypeError", "message": "msg", "stack": "...", "cause": { ... } } }
```

`Try.fromJSON` reads the new shape and falls back to the 1.1.0 flat shape for back-compat. `Task.Err` previously lost `stack` entirely; it now survives. Reconstructed errors are plain `Error` instances with `name`/`message`/`stack`/`cause` set — `e.name === "TypeError"` works as a discriminator, `e instanceof TypeError` does not (registry mechanism for custom Error subclasses deferred to a future minor).

**Behavior change — `Lazy.serialize()` forces the thunk:**

Pre-1.2.0, an unevaluated `Lazy` serialized to `{_tag: "Lazy", evaluated: false}` — a shape that could never be reconstructed (you can't recover a closure from JSON). 1.2.0 eliminates this state entirely: `Lazy.serialize()` (and instance `toJSON()`, and `toValue()`) forces the thunk before emitting. If the thunk throws, the failure is captured via `SerializedError`; on deserialize the reconstructed Lazy rethrows the same error on access.

Trade-off: serializing a Lazy now has a **visible side effect** (runs the thunk). This matches Scala's `lazy val` behavior on a serializable class — the alternative is silent data loss. Document this for any code that previously relied on the no-op unevaluated projection.

**Internal — central factory now used everywhere:**

5 types (Lazy, LazyList, Stack, Tuple, Task) previously hand-rolled their `toJSON`/`toYAML`/`toBinary` methods inside `serialize()`, bypassing `createSerializer`. All now route through the central factory (with `createTaggedSerializer` for failure-branch envelopes that don't fit the `{value}` shape). `createCustomSerializer` retained for back-compat but marked `@deprecated` — its single internal caller (`Try.Failure`) is migrated.

**Pluggability for non-functype types in the same JSON:**

Plain JSON values (objects without `@functype`, arrays, primitives) walk through `Serialization.deserialize` unchanged — recursion descends into their children to revive any functype envelopes nested inside, but the surrounding plain data is preserved as-is. This is what makes the DBOS integration work: a step return like `{ user: "alice", score: Right(42), tags: List(["a"]) }` round-trips with `user` as a plain string, `score` as a functype `Either` instance, and `tags` as a functype `List` instance.

**No DBOS / SuperJSON facade in this package:**

`functype` stays serializer-agnostic per the original proposal. The DBOS integration is ~8 lines in the consumer's code (constructs a `DBOSSerializer` from `Serialization.serialize`/`deserialize`); see `docs/archive/proposals/universal-deserialize.md` for the pattern. functype itself knows only its own types + JSON.

**Out of scope (intentional):**

- Custom Error subclass deserialization via a registry — deferred. The plain-Error projection handles the 90% case.
- YAML/binary universal deserializers parallel to the JSON one — `serialize().toYAML()`/`.toBinary()` still per-type only.
- Streaming/chunked decoders — `Serialization.deserialize` is value-in/value-out.

## 1.1.0 - 2026-05-31

`Decoder<T>` API for HTTP responses + request-side ADT flatten bugfix.

**New (additive):**

- `functype/decoder` module: `Decoder<A> = (raw: unknown) => Either<DecoderError, A>` with recursive `DecoderError` (Leaf | Composite) that mirrors input structure on multi-field failures. Effect-TS Schema-style design — accumulation lives in the error data, not in the wrapper.
- Primitives: `Decoder.string`, `Decoder.number`, `Decoder.boolean`, `Decoder.unknown`, `Decoder.nullable`.
- ADT decoders (null-bias by default): `Decoder.option`, `Decoder.either.envelope`, `Decoder.either.discriminated`, `Decoder.list`, `Decoder.array`, `Decoder.map`, `Decoder.object`.
- Tagged round-trip variants: `Decoder.tagged.option/either/try/list/map/obj` — wraps existing `fromJSON` companions for functype-to-functype services that round-trip the `{_tag, value}` shape.
- `HttpRequestOptions.decode?: Decoder<T>` — Either-returning decoder. Maps `Left(DecoderError)` to `HttpError.DecodeError(cause: DecoderError)` preserving structural failure info.
- `HttpRequestOptions.flatten?: boolean` (default `true`) — opt out to emit each ADT's canonical `{_tag, value}` shape via `toValue()` instead of flattening to primitives.

**Bug fix (request-side default behavior):**

Request bodies containing functype ADTs now flatten to primitives by default — `Option` → nullable, `List` → array, `Either` → right-value (Left throws as programmer error), `Try` → success-value (Failure throws), `Map` (string-keyed) → record. The previous behavior was producing messy `JSON.stringify`-of-property-bag output (e.g. `{age: Option(30)}` would serialize as `{"age":{"_tag":"Some","value":30,"isEmpty":false,"size":1}}` since only `Either` had a `toJSON()` method) — broken for the 95%-case of external REST APIs.

If you were intentionally relying on the prior tagged-emission behavior for functype-to-functype services, pass `flatten: false` per request to opt into the canonical `{_tag, value}` shape (now produced explicitly via each ADT's `toValue()`, not via `JSON.stringify` accident) and use `Decoder.tagged.*` on the response side for round-trips.

**Deprecated (still works):**

- `HttpRequestOptions.validate` is now `@deprecated`. Prefer `decode: Decoder<T>` for the Either-returning path; for throw-pattern adapters like Zod's `.parse`, use an adapter package (`functype-zod`'s `Decoder.fromZod(schema)` — separate release) or wrap the throwing function in a small custom decoder. `validate` is kept for full back-compat and will be removed in a future major release.

**Pluggability:** `Decoder<T>` is a plain function type. Anything matching `(raw: unknown) => Either<DecoderError, T>` IS a decoder — no plugin registration, no factory. Zod/TypeBox/Valibot/AJV/hand-rolled adapters are ~15 lines each. A first-party `functype-zod` adapter package will follow in a separate release.

**Naming note:** the recursive structural error type is called `DecoderError` (not `DecodeError`) to avoid collision with the existing `HttpError.DecodeError` variant — these are at different layers. `HttpError.DecodeError` is the HTTP-level wrapper; its `cause` field carries a `DecoderError` when the decode-path failed. The type alias `HttpError.ResponseDecodeError` is exported as a more descriptive synonym for the same variant.

## 1.0.1

### Major Changes (family-cadence reset)

- Family-cadence reset to `1.0.1` so functype catches up to `functype-os`/`-log`/`-react` which were unintentionally jumped to `1.0.0` on 2026-05-30 by a `workspace:^` peerDependency + Changesets dependent-update cascade. No code changes vs `0.61.0` — version-number realignment only. See `docs/RELEASE.md` _Independent cadence_ for the full post-mortem and the new `scripts/check-publish-safety.ts` gate that prevents repeats.

## 0.61.0

### Minor Changes

- [#157](https://github.com/jordanburke/functype/pull/157) [`d9999ca`](https://github.com/jordanburke/functype/commit/d9999ca054867276a775d5b820beb069aa95edd6) Thanks [@jordanburke](https://github.com/jordanburke)! - - **functype** — Adds `HttpClientConfig.beforeRequest`: an effectful (IO-returning) transformer that runs after `defaultHeaders` and per-call headers are merged but before the request is sent. Closes the request/response asymmetry called out in [#154](https://github.com/jordanburke/functype/issues/154) — the response side already composes via `.tap`/`.map`/`.flatMap`/`.catchTag` on the returned IO; `beforeRequest` lets request-side concerns (auth refresh, request IDs, entry logging) compose the same way using standard IO operators. Returning a failed IO short-circuits the call with the produced `HttpError` and `fetch` is never invoked. Strictly additive; no breaking changes. New `HttpRequestView` type re-exported from `functype/fetch`. `Http`'s CLI/MCP entry now also surfaces the full IO chain methods (`.tap` etc.) that were previously not discoverable from the type's own listing, and `npx functype Http --full` now shows the JSDoc'd `HttpClientConfig` interface. Closes [#154](https://github.com/jordanburke/functype/issues/154).

### Patch Changes

- [#144](https://github.com/jordanburke/functype/pull/144) [`4ad7f3d`](https://github.com/jordanburke/functype/commit/4ad7f3d80d778d22dc07797fc514475c2a57677f) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — Adds `IO.bracketExit(acquire, use, release)`. Same shape as `IO.bracket`, but the `release` callback receives the use-step's `Exit<E, A>` so cleanup can branch on success vs failure (matches the Effect-TS / ZIO / cats-effect convention). Existing `IO.bracket` is unchanged. Closes [#136](https://github.com/jordanburke/functype/issues/136).
  - **functype-os** — `Fs.mkdir` and `Fs.mkdirSync` now refuse `recursive: true` under Linux magic filesystem roots (`/proc/`, `/sys/`, `/dev/`) and return `Left(FsError(...))` immediately. Fixes the indefinite hang reported on Linux where libuv blocks instead of erroring fast. Cross-platform behavior is now predictable. Closes [#135](https://github.com/jordanburke/functype/issues/135).

- [#157](https://github.com/jordanburke/functype/pull/157) [`d9999ca`](https://github.com/jordanburke/functype/commit/d9999ca054867276a775d5b820beb069aa95edd6) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — `src/cli/data.ts` interface lists are now source-derived. A new parser (`scripts/parse-interfaces.ts`) walks each type's `extends` clause and recursively expands wrapper interfaces (`Functype`/`FunctypeBase`/`FunctypeSum`/`FunctypeCollection`/`AsyncMonad`/`Monad`/`Applicative`); `scripts/generate-interfaces.ts` writes `src/cli/interfaces.generated.ts`; a `test/cli/data-sync.spec.ts` superset-check fails CI if `TYPES[name].interfaces` ever drops anything in the source extends chain. Effect: `Doable`, `Promisable`, `Reshapeable`, `Applicative`, `AsyncMonad` now correctly surface for `Option`, `Either`, `Try`, `List`, `Obj`, `Lazy`, `Task` in `npx functype <Type>` and `functype-mcp-server`'s `search_docs`. Closes a discoverability gap that hid `Doable` for the entire monadic family.

## 0.60.7

### Patch Changes

- [#142](https://github.com/jordanburke/functype/pull/142) [`4a3d8c9`](https://github.com/jordanburke/functype/commit/4a3d8c99398cce9075e339ecf96697d4ff4ff119) Thanks [@jordanburke](https://github.com/jordanburke)! - Family-cadence patch release.
  - **functype** — `Either`, `Option`, and `Try` now have `.expect(handler)` for unwrap-or-panic with a `never`-returning handler. Sidesteps the TS narrowing trap where arrow-typed `(...): never` helpers fail to propagate through `isLeft()`/`isNone()`/`isFailure()` checks. Closes [#138](https://github.com/jordanburke/functype/issues/138).
  - **functype-os** — `Fs.appendFile` (TaskResult) and `Fs.appendFileSync` (Either) added, mapping errno → `FsError` consistent with the existing read/write helpers. Lets consumers ndjson-append without giving up O_APPEND atomicity. Closes [#128](https://github.com/jordanburke/functype/issues/128).
  - **eslint-plugin-functype** — `prefer-flatmap` no longer flags `[...arr, x]` / `[...arr]` / `[x, ...arr]` (append/identity) or tuple-shaped literals like `[k, v]`. Only fires when the array literal contains at least one nested `ArrayExpression`. Closes [#137](https://github.com/jordanburke/functype/issues/137).

## 0.60.6

### Patch Changes

- [#127](https://github.com/jordanburke/functype/pull/127) [`8c05537`](https://github.com/jordanburke/functype/commit/8c05537504e6a21d69d3093a687fae983a0c641c) Thanks [@jordanburke](https://github.com/jordanburke)! - Align `functype-react` to the family's shared version line. No code changes — this is a coordinated patch bump across all five publishable packages so they ship together at the same version going forward:
  - `functype`, `functype-os`, `functype-log`, `functype-mcp-server`: `0.60.5 → 0.60.6`
  - `functype-react`: `0.60.5 → 0.60.6` (jumped from initial `0.1.0` on npm; npm accepts the forward semver step)

  `functype-react@0.1.0` published via the local escape-hatch path; it has the same workspace deps and peers as the other 0.60.x packages, so the version jump is a label change rather than a code break for consumers.

## [0.60.1] — IO covariant in E and A

Completes the covariance story for the error and success channels of `IO<R, E, A>`.
`IO<R, never, A>` now assigns to `IO<R, AnyError, A>` without a cast, removing a class
of `apiSucceed`-style wrappers that downstream consumers (e.g. dokploy's SomaMCP) had
to carry.

### Highlights

- **`IO<in out R extends Type, out E extends Type, out A extends Type>`** — E and A
  covariant; R invariant (ZIO-style `<in R>` still deferred, tracked separately).
- **`IOEffect.RecoverWith` and `IOEffect.Fold`** widen the input positions of their
  stored callbacks to `unknown`. Matches the pre-existing pattern already used on
  `IOEffect.Map`/`FlatMap`/`MapError`. The public `IO.recoverWith` / `IO.fold`
  methods keep their typed callback signatures — only the internal tagged-union
  representation forgets the input type (the interpreter doesn't need it).
- **Interpreter**: three `unsafeCoerce` sites in `runEffectSync` / `runEffect` to
  recover the erased return type after widening.

### Why it was invariant before

`IOEffect` stored `f: (e: E) => IO<R, E, A>` in two branches. Using `E` as _both_ a
parameter and part of the return of one function type makes that stored function
invariant in `E`, which propagated through the `readonly [IOEffectKey]` field and
locked the whole `IO` interface into invariance. Widening the stored input to
`unknown` eliminates the contravariant use; only the return position holds `E`, so
the whole union is covariant in `E` again.

### Tests

- New `test/io/io-variance.spec.ts` — six `expectTypeOf` / `@ts-expect-error`
  assertions guarding E and A covariance and rejecting narrowing.
- All 1569 existing tests pass unchanged.

### Still to do

- **`<in R>` (ZIO-style contravariant R)** — scoped as a follow-up PR. The
  union-based R encoding (functype uses `R | R2`, ZIO uses `R & R2`) interacts with
  `provideContext<R2 extends R>` and `Exclude<R, R2>` in ways that need their own
  audit before flipping the annotation.

## [0.60.0] — Variance across the container family

> Note: originally tagged as `0.6.0` but retagged as `0.60.0` because
> `0.59.1 > 0.6.0` by semver numeric comparison (59 > 6). `0.60.0` is the
> correct successor to the `0.59.x` line.

End of a three-release arc that made every functype container covariant in its
type parameter(s). What started as a surface-level fix to `Either.or` in
0.57.2 turned into an architectural realignment with Scala's collection
variance model. Every documented below is motivated by a real downstream bug
surfaced by envpkt (41 TS errors in a boot pipeline); all 1563 library tests
pass at every step.

### Highlights

- **Sum types (Option, Either, Try)** are covariant in all their type params.
  Narrow errors assign to wider unions via subtyping. Sum types no longer
  extend `Traversable` — they extend a new `FunctypeSum` base with no
  collection-style methods.
- **Collections (List, Set, LazyList)** are covariant via Scala-aligned
  method shapes — `contains(unknown)`, `remove(unknown)`, `add<B>(B): C<A | B>`,
  `concat<B>(C<B>): C<A | B>`, and `reduce` guarded by `Widen<A, B>`.
- **`Widen<A, B>`** (`src/typeclass/variance.ts`) — TS equivalent of Scala's
  `[B >: A]` lower-bound constraint. `list.reduce<string>(...)` on `List<number>`
  is now a compile error instead of a runtime type lie.
- **Base typeclasses** (Traversable, Extractable, Functor, Monad, AsyncMonad,
  etc.) declared `<out T>` with widened default shapes. Every implementer
  inherits the covariance-safe signatures without per-type overrides.
- **Intentionally invariant**: `Ref<A>` (mutable cell), `Obj<T>` (record type
  with `keyof`), `Map<K, _>` (key type). Documented with JSDoc.
- **Still to do**: `IO<R, E, A>` needs ZIO-style `<in R, out E, out A>`
  variance (requirement channel is contravariant). Separate patch.

### Release timeline

- **0.57.2** — widen `Either.or` to `<L2>(Either<L2, R>): Either<L | L2, R>`
- **0.57.3** — widen `Either.ap`, `flatMap`, `flatMapAsync`, `traverse`
- **0.58.0** — Scala-aligned sum-type hierarchy; `FunctypeSum` base; Either/Try
  drop collection-ish methods (reduce, reduceRight, size, isEmpty, find,
  count, toList, lazyMap). Declared `<out L, out R>` / `<out T>`
- **0.58.1** — List<out A>, Set<out A>. Scala-aligned `unknown` element
  queries + `<B>` additive widening. `toList()` restored on sum types
- **0.59.0** — Phase A: typeclass-level upgrade. `Widen<A, B>` helper + per-site
  `reduceWiden`/`reduceRightWiden` utilities. Redundant per-type overrides
  removed
- **0.59.1** — Phase B: remaining containers declared covariant (Identity,
  Tuple, LazyList, Lazy, Map<K, +V>, Task/Ok/Err). Ref and Obj documented as
  intentionally invariant
- **0.6.0** — variance guide (`docs/variance-guide.md`), skill update,
  feature-matrix variance column. Milestone release

### Breaking

- `Either<L, R>` and `Try<T>` no longer have `reduce`, `reduceRight`, `size`,
  `isEmpty`, `find`, `count`, `toList`, `lazyMap`. Migration:
  - `.reduce(f)` → `.fold(() => zero, r => f(zero, r))`
  - `.size` / `.isEmpty` → `e.isLeft()` / `e.isRight()`
  - `.toList()` → `.fold(() => [], r => [r])` (or `.toOption().toList()`)
  - `.find(p)` → `.exists(p) ? .toOption() : None()`
  - `.lazyMap(f)` → `.map(f)` or generator literal

- `reduce<B>(op)` on collections now requires `B` to be a supertype of `A`
  (enforced via `Widen<A, B>`). Prior code with `B = A` (the default) compiles
  unchanged. Code that explicitly passed an unrelated `B` compiled silently
  and produced a runtime type lie — that code now fails at compile time, as
  intended.

See [`docs/variance-guide.md`](./docs/variance-guide.md) for the full
contributor reference.

## [0.17.2] - 2025-01-15

### Added

- **Companion Pattern Enhancements**
  - New `CompanionTypes` module with helper types for working with Companion objects
    - `CompanionMethods<T>` - Extract companion methods type from a Companion object
    - `InstanceType<T>` - Extract instance type from a constructor function
    - `isCompanion()` - Runtime type guard to check if a value is a Companion object
  - New `SerializationCompanion` module with shared serialization utilities
    - `createSerializer()` - Create serializer for simple tagged values
    - `createCustomSerializer()` - Create serializer for complex objects
    - `fromJSON()`, `fromYAML()`, `fromBinary()` - Generic deserialization helpers
    - `createSerializationCompanion()` - Generate companion serialization methods
  - Added type guards as static methods in companion objects:
    - `Option.isSome()`, `Option.isNone()` - Type guards for Option
    - `Either.isLeft()`, `Either.isRight()` - Type guards for Either
    - `Try.isSuccess()`, `Try.isFailure()` - Type guards for Try

- **Documentation**
  - New comprehensive guide: `docs/companion-pattern.md` explaining the Companion pattern
  - Complete examples of creating custom Companion types
  - Comparison with Scala's companion objects and other TypeScript patterns

- **Exports**
  - Added package.json exports for `functype/companion` and `functype/serialization`
  - Exported CompanionTypes and SerializationCompanion from main index

### Changed

- **Either Refactored to Companion Pattern**
  - Migrated Either from namespace object pattern to Companion pattern for consistency
  - All Either types now follow the same pattern as Option, Try, List, etc.
  - Added `Either.left()` and `Either.right()` companion methods
  - Maintains full backward compatibility - `Left()` and `Right()` still work

- **Standardized Serialization**
  - Refactored 6 types to use shared serialization utilities: Option, Try, List, Set, Map, Lazy
  - Consistent serialization format across all types
  - Reduced code duplication and improved maintainability

### Tests

- Added comprehensive tests for CompanionTypes helper functions (9 tests)
- Added comprehensive tests for SerializationCompanion utilities (18 tests)
- All 1079 existing tests continue to pass

## [0.8.61] - 2025-03-30

### Added

- Enhanced Task module to better serve as adapter between promise-based code and functional patterns
  - Added `fromPromise` adapter to convert promise-returning functions to Task-compatible functions
  - Added `toPromise` converter to transform Task results back to promises
  - Improved documentation for Task semantics
- Created comprehensive migration guide in `docs/TaskMigration.md` showing how to migrate from promises to functional Task patterns
- Added tests for new Task adapter methods

### Fixed

- Fixed implementation of `Task.Sync` and `Task.Async` to better align with functional patterns
- Updated README with correct Task examples and usage patterns
- Updated TODO list to reflect completed Task enhancements

## [0.8.60] - 2025-03-15

### Changed

- Renamed Companion parameters for better clarity

## [0.8.59] - 2025-03-10

### Changed

- Reorganized directory structure
- Fixed compilation issues throughout the codebase
