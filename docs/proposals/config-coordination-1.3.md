# Config coordination + core `Logger` interface (1.3.0)

## Context

Every functype-backed service today rewrites the same boot-time pattern: load env vars, fetch secrets from a vault (Infisical / Doppler / Vault / AWS), merge with defaults, log a diagnostic block (masked sensitive + raw public), detect env-mismatch between host and vault, fail-fast in production. The reference shape lives in `cq-api`'s `AppEnv.ts` — ~150 lines of orchestration on top of `dotenv` + Infisical SDK + chalk + custom `loadVault`/`loadAll` helpers. That same shape is duplicated across consumers with subtle differences in masking rules, log formatting, and failure modes.

Two problems:

1. **No `ConfigSource` interface.** `functype-os/env` wraps `process.env` only. Vault adapters don't have a contract to satisfy, so every consumer hand-writes a parallel `loadVault` helper that merges env-precedence over vault. There's no community plugin point — `functype-infisical`, `functype-doppler`, etc. can't exist as separate community packages because there's nothing to plug into.

2. **No standardized boot diagnostics.** Each app reinvents the masked-secret log block, the env-mismatch check, the fail-fast-in-prod rule. The operational visibility ("did the deploy pick up my config?") is the part that matters most and is the part that varies most across consumers.

Intended outcome:
- Ship a minimal `Logger` interface in **functype core** (`functype/logger` subpath). 4 methods (`debug`/`info`/`warn`/`error`), type-only, no implementation. One shared contract every present and future sibling package references — no more ad-hoc invented logger interfaces per package.
- Ship `ConfigSource` interface in `functype-os/config` — anything producing `(key: string) => Option<string>` satisfies it. Built-in `ProcessEnvSource` + `StaticSource`; user-written vault adapters (no SDKs ship from functype).
- Ship `Layered` for first-wins composition over N sources. Consumer asks "is this config defined?" not "is this env or vault?"
- Ship `bootDiagnostics` with standardized log shape: masked sensitive keys, raw public keys, env-mismatch detection, fail-fast on missing required.
- Ship `consoleBootLogger` (typed as core `Logger`) — zero-dep default, raw ANSI colors, respects `NO_COLOR`/`FORCE_COLOR`/`isTTY`. LogLayer integration via structural typing — `DirectLogger` from `functype-log/direct` satisfies `Logger` shape; no adapter required.
- Zero new runtime deps. `functype` core stays zero-dep; `functype-os` keeps its peer-only-on-functype dependency profile.

Ships as **1.3.0** — pure addition (new `functype/logger` subpath + new `functype-os/config` subpath), no breaking changes. Family-cadence release bumps all 5 `functype-*` packages together per workspace convention.

## Why this shape (design rationale)

| Rejected option | Why rejected |
|---|---|
| Keep `BootLogger` invented in `functype-os/config` only; don't add `Logger` to core | Every future sibling package would invent the same 3-4 method interface (`BootLogger`, `FetchLogger`, `ReactLogger`, …). Unification later is harder than getting it right now. Core `Logger` is type-only — zero bundle cost, zero runtime, follows existing pattern of typeclass interfaces (Functor/Monad/Foldable). |
| Logger in core WITH a default impl (`createConsoleLogger`) | Forces an opinion on output format and `console` global compatibility (Bun/Deno/edge runtimes). Interface-only stays library-shaped (not framework-shaped). Default impl belongs in the consumer package (`functype-os/config` ships `consoleBootLogger`); core stays pure types. |
| Logger PLUS Clock/Random/Tracer in core as a service set | Effect ships these because Effect is a framework. functype is a library. Logger is uniquely justified because every production TS app already has one — naming an existing concept. Clock/Random/Tracer aren't universal in the same way; defer until/unless real demand surfaces. |
| Separate `SecretSource` + `EnvSource` modules + third coordinator package | Same lookup contract (`get(key): Option<string>`); splitting fights the `Layered` abstraction whose whole point is hiding source from consumer. Async init is a constructor concern, not an interface concern. Masking is per-key (declared by caller), not per-source. |
| Ship vault-SDK adapters (Infisical, Vault, Doppler, AWS Secrets Manager, 1Password) | functype shouldn't take 6+ peer deps on third-party services; SDK churn would dominate the package's release cadence. `ConfigSource` interface IS the plugin point — community packages or in-app adapters satisfy it. |
| Mandatory logger choice (console-only OR LogLayer-only) | Console-only loses operational scannability when consumers want structured logs. LogLayer-only forces a logging stack on consumers who want a single boot block and nothing else. Pluggable interface with smart default serves both. |
| `chalk` peer dep for colors | Raw ANSI is ~30 lines and zero deps. ANSI escape codes haven't changed since 1979. chalk adds ~5KB + version-churn maintenance + tree-shake friction (module-level state). |
| Expand existing `functype-os/env` to host this | `env` is a thin `process.env` wrapper today. Adding async coordination, logger interface, ANSI colors, fail-fast diagnostics bloats it past what "Env" connotes. Two distinct scopes deserve two subpaths. |
| New top-level `functype-config` package | More cross-package surface for the same value. This is coordination over OS-level inputs; belongs in `functype-os` alongside `env`/`fs`/`path`/`platform`. Reserves `functype-config` for hypothetical future hot-reload/config-watching/rotation work that would warrant a heavier dep profile. |
| Ship a `loggerFromLogLayer` adapter in `functype-log` | Unnecessary cross-package edge. `DirectLogger`'s `debug/info/warn/error(msg, meta?): void` methods already structurally satisfy core `Logger`. Users pass `createDirectConsoleLogger()` directly with zero adapter code. |

Chosen because:
- **One `Logger` shape unifies the ecosystem.** Every present and future functype package logs against the same 4-method interface. functype-log's `DirectLogger` structurally satisfies it. User code writes ONE logger adapter that works everywhere — boot diagnostics, IO debug hooks, future structured events.
- **One `ConfigSource` interface for all config sources.** Env, vault, defaults, file-based, anything. Layered composes them uniformly.
- **Sensitivity is declared at diagnostics time** (`sensitive: [...]`, `public: [...]`), not at source time. The same key from env or vault gets masked identically.
- **Zero new runtime deps.** Core `Logger` is type-only; `consoleBootLogger` default keeps the dep-free path; LogLayer interop is free via structural typing.
- **Pure addition.** Existing `functype/option`, `functype-os/env` stay untouched; consumers opt in by importing the new subpaths.

## Approach

### 1. Core `Logger` interface in `functype`

New file `packages/functype/src/logger/Logger.ts`:

```ts
export interface Logger {
  debug(message: string, metadata?: Record<string, unknown>): void
  info(message: string, metadata?: Record<string, unknown>): void
  warn(message: string, metadata?: Record<string, unknown>): void
  error(message: string, metadata?: Record<string, unknown>): void
}
```

That's the entire module. No companion, no implementation, no helpers. Subpath barrel at `packages/functype/src/logger/index.ts` re-exports the type; `packages/functype/package.json` adds `"./logger"` to its exports.

Design choices:
- **4 methods, all mandatory.** debug/info/warn/error covers every real production logger. Mandatory means no defensive `logger.debug?.()` checks at call sites — better DX to require a no-op than to optional everything.
- **No `trace`/`fatal`/`child`/`withContext`.** Half of loggers don't have trace/fatal; child/withContext are fancier features. Richer loggers (`DirectLogger` from `functype-log`) add methods on top and still satisfy `Logger` structurally. Standard contravariance: DirectLogger satisfies Logger; Logger does not satisfy DirectLogger.
- **`metadata?: Record<string, unknown>`** matches `DirectLogger`'s `LogMetadata` shape for free interop. Verified during exploration: `DirectLogger`'s `info/warn/error(msg, meta?)` signatures structurally satisfy this `Logger` shape.
- **Type-only ship.** Zero runtime, zero bundle impact, zero opinion on output format. Follows existing functype pattern (`Functor`, `Monad`, `Foldable` are interfaces the ecosystem implements).
- **Reachable from the top-level `functype` barrel AND the `functype/logger` subpath.** Matches the convention every other functype type follows (`Option`, `Either`, `JSONValue`, etc.) — making `Logger` an outlier would create more friction than the collision risk it avoids. If a consumer already has a local `Logger` type, the TS-standard rename-on-import handles it: `import type { Logger as FunctypeLogger } from "functype"`. The subpath stays for users who prefer narrow imports.

### 2. `ConfigSource` interface

New file `packages/functype-os/src/config/ConfigSource.ts`:

```ts
import type { Option } from "functype"

export interface ConfigSource {
  readonly name: string                       // for diagnostics ("process.env", "infisical", …)
  get(key: string): Option<string>
}
```

That's the whole contract. Synchronous lookup, returns `Option<string>`. Async work happens at construction time (vault auth, secret fetch into in-memory map) — once a source exists, lookups are sync.

### 3. Built-in sources

`packages/functype-os/src/config/ProcessEnvSource.ts`:

```ts
import { Env } from "@/env"
import type { ConfigSource } from "./ConfigSource"

export const ProcessEnvSource = (): ConfigSource => ({
  name: "process.env",
  get: (key) => Env(key),
})
```

`packages/functype-os/src/config/StaticSource.ts`:

```ts
export const StaticSource = (
  entries: Readonly<Record<string, string>>,
  name = "static",
): ConfigSource => ({
  name,
  get: (key) => Option(entries[key]),
})
```

**Not shipped:** `DotenvSource`. `dotenv` is a well-known third-party package; consumers call `import "dotenv/config"` at process boot and `ProcessEnvSource()` picks up the populated values. Wrapping it adds no value.

### 4. `Layered` composition

`packages/functype-os/src/config/Layered.ts`:

```ts
export const Layered = (sources: readonly ConfigSource[]): ConfigSource => ({
  name: sources.map((s) => s.name).join(" > "),
  get: (key) =>
    sources.reduce<Option<string>>(
      (acc, source) => (acc.isSome() ? acc : source.get(key)),
      Option<string>(undefined),
    ),
})
```

First-wins precedence. The composed source's `name` reflects the resolution chain (e.g. `"process.env > infisical > defaults"`) which `bootDiagnostics` echoes in its header.

### 5. `consoleBootLogger` default (typed as core `Logger`)

`packages/functype-os/src/config/consoleBootLogger.ts` — default implementation satisfying core `Logger`, raw ANSI, respects standards:

```ts
import type { Logger } from "functype"

import { gray, yellow, red } from "./colors"

const stamp = () => new Date().toISOString()

export const consoleBootLogger: Logger = {
  debug: (msg, meta) => console.debug(`${gray(stamp())} ${gray("DEBUG")} ${msg}`, meta ?? ""),
  info:  (msg, meta) => console.log(`${gray(stamp())} ${msg}`, meta ?? ""),
  warn:  (msg, meta) => console.warn(`${gray(stamp())} ${yellow("WARN")} ${msg}`, meta ?? ""),
  error: (msg, meta) => console.error(`${gray(stamp())} ${red("ERROR")} ${msg}`, meta ?? ""),
}
```

All 4 methods present (debug included to satisfy core `Logger`). LogLayer users substitute `createDirectConsoleLogger()` from `functype-log/direct` — that `DirectLogger` structurally satisfies `Logger`, no adapter required.

### 6. ANSI color helpers (internal, ~30 lines)

`packages/functype-os/src/config/colors.ts`:

```ts
const shouldColor = (): boolean => {
  if (process.env.NO_COLOR !== undefined) return false
  if (process.env.FORCE_COLOR !== undefined) return true
  return process.stdout.isTTY ?? false
}

const wrap = (code: string) => (s: string): string =>
  shouldColor() ? `\x1b[${code}m${s}\x1b[0m` : s

export const green   = wrap("32")
export const yellow  = wrap("33")
export const blue    = wrap("34")
export const magenta = wrap("35")
export const cyan    = wrap("36")
export const red     = wrap("31")
export const gray    = wrap("90")
```

Honors `NO_COLOR` ([no-color.org](https://no-color.org/)), `FORCE_COLOR` (CI users wanting color in piped output), `isTTY` (default-off when redirected). Internal — not exported from the subpath; pure implementation detail.

### 7. `maskValue` helper (exported)

`packages/functype-os/src/config/mask.ts`:

```ts
export const maskValue = (value: string): string => {
  if (value.length <= 8) return "****"
  return `${value.slice(0, 2)}****${value.slice(-2)}`
}
```

Exported because consumers may want it for ad-hoc masking outside `bootDiagnostics`.

### 8. `bootDiagnostics` — the standardized log block + fail-fast

`packages/functype-os/src/config/bootDiagnostics.ts`:

```ts
import type { Either, Logger } from "functype"
import { Left, Right, List } from "functype"

import type { ConfigSource } from "./ConfigSource"
import { consoleBootLogger } from "./consoleBootLogger"
import { maskValue } from "./mask"
import { green, yellow, blue, magenta, red } from "./colors"

export interface BootDiagnosticsOptions {
  readonly source: ConfigSource
  readonly required?: readonly string[]      // missing → diagnostic failure
  readonly sensitive?: readonly string[]     // logged with masked value
  readonly public?: readonly string[]        // logged with raw value
  readonly hostEnv?: string                  // if provided with vaultEnvKey, detects mismatch
  readonly vaultEnvKey?: string
  readonly failOn?: "missing" | "never"      // default "never"; throws/exits if "missing" + required absent
  readonly logger?: Logger                   // default consoleBootLogger; any core-Logger impl works
  readonly serviceName?: string              // shown in header
}

export interface MissingKey {
  readonly key: string
  readonly required: boolean
}

export const bootDiagnostics = (opts: BootDiagnosticsOptions): Either<List<MissingKey>, void> => {
  const logger = opts.logger ?? consoleBootLogger
  const required = opts.required ?? []
  const sensitive = opts.sensitive ?? []
  const publicKeys = opts.public ?? []

  // Header
  logger.info(`${blue("📦")} Boot diagnostics: ${opts.serviceName ?? "service"}`)
  logger.info(`   source: ${opts.source.name}`)

  // Required-key check (`isEmpty` is a property, not a method)
  const missing = required.filter((k) => opts.source.get(k).isEmpty)

  // Sensitive (masked)
  if (sensitive.length > 0) {
    logger.info(yellow("🔐 Sensitive:"))
    for (const key of sensitive) {
      const value = opts.source.get(key)
      logger.info(`   ${key.padEnd(28)} ${value.fold(() => red("NOT_LOADED"), maskValue)}`)
    }
  }

  // Public (raw)
  if (publicKeys.length > 0) {
    logger.info(green("⚙️  Public:"))
    for (const key of publicKeys) {
      const value = opts.source.get(key)
      logger.info(`   ${key.padEnd(28)} ${value.fold(() => red("NOT_LOADED"), (v) => v)}`)
    }
  }

  // Env-mismatch check
  if (opts.hostEnv && opts.vaultEnvKey) {
    const vaultEnv = opts.source.get(opts.vaultEnvKey)
    vaultEnv.fold(
      () => logger.warn(`Vault env key '${opts.vaultEnvKey}' not present — skipping mismatch check`),
      (v) => {
        if (v === opts.hostEnv) {
          logger.info(`${magenta("🌍")} Environment: ${opts.hostEnv} (host) ↔ ${v} (vault) ${green("✓")}`)
        } else {
          logger.error(
            `${magenta("🌍")} Environment MISMATCH: host=${opts.hostEnv} vault=${v}`,
            { hostEnv: opts.hostEnv, vaultEnv: v },
          )
        }
      },
    )
  }

  if (missing.length === 0) {
    logger.info(green("✅ All required keys present"))
    return Right(undefined)
  }

  logger.error(red(`❌ Missing required keys (${missing.length}):`))
  for (const key of missing) logger.error(`   ${key}`)

  const missingList = List(missing.map((key) => ({ key, required: true })))
  if (opts.failOn === "missing") {
    process.exit(1)
  }
  return Left(missingList)
}
```

Returns `Either<List<MissingKey>, void>` so non-fatal callers can inspect the result; `failOn: "missing"` shortcuts to `process.exit(1)` for production/staging guards. Always logs the diagnostic block regardless of outcome.

### 9. Barrel exports

`packages/functype/src/logger/index.ts`:

```ts
export type { Logger } from "./Logger"
```

`packages/functype/package.json` adds `"./logger"` subpath export. ALSO re-exported from the top-level `functype` barrel (via `export * from "@/logger"` in `src/index.ts`) so that `Logger` is reachable the same way as every other public type — matches the convention every sibling package follows. Users with their own `Logger` type rename on import: `import type { Logger as FunctypeLogger } from "functype"`.

`packages/functype-os/src/config/index.ts`:

```ts
export type { ConfigSource } from "./ConfigSource"
export { ProcessEnvSource } from "./ProcessEnvSource"
export { StaticSource } from "./StaticSource"
export { Layered } from "./Layered"
export { consoleBootLogger } from "./consoleBootLogger"
export { maskValue } from "./mask"
export { bootDiagnostics } from "./bootDiagnostics"
export type { BootDiagnosticsOptions, MissingKey } from "./bootDiagnostics"
```

`packages/functype-os/package.json` adds the subpath export `"./config"`. Note: `Logger` is NOT re-exported from `functype-os/config` — consumers import it directly from `functype` (preferred, matches the workspace barrel convention) or `functype/logger` (subpath, for narrow imports) — `Logger`'s canonical home is in `functype` core, not `functype-os`.

## Usage (cq-api AppEnv refactored)

```ts
import { Env } from "functype-os/env"
import { Layered, ProcessEnvSource, bootDiagnostics, type ConfigSource } from "functype-os/config"
import { Option, Try } from "functype"
import { InfisicalSDK } from "@infisical/sdk"
import "dotenv/config"

const ENV = Env("NODE_ENV").orElse("local")

// User-written, ~12 lines, no SDK ships from functype
const InfisicalSource = async (opts: {
  token: string
  env: string
  projectId: string
}): Promise<ConfigSource> => {
  const client = new InfisicalSDK().auth().accessToken(opts.token)
  const result = await client.secrets().listSecrets({ environment: opts.env, projectId: opts.projectId })
  const map = new Map((result.secrets ?? []).map((s) => [s.secretKey, s.secretValue]))
  return { name: "infisical", get: (key) => Option(map.get(key)) }
}

const SECRETS_TOKEN = Env("SECRETS_TOKEN").orThrow(new Error("Missing SECRETS_TOKEN"))

const config = Layered([
  ProcessEnvSource(),
  await InfisicalSource({ token: SECRETS_TOKEN, env: ENV, projectId: "cq-api" }),
])

await bootDiagnostics({
  serviceName: "cq-api",
  source: config,
  required: ["SUPABASE_URL", "SUPABASE_KEY", "OPENAI_API_KEY", "R2_SECRET_KEY"],
  sensitive: [
    "PLUNK_API_KEY", "SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_DB_URL",
    "R2_ACCOUNT_ID", "R2_ACCESS_KEY", "R2_SECRET_KEY", "T_LABS_API_KEY",
    "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
  ],
  public: ["ENV", "ENABLE_CHAT", "ENABLE_VIDEO_UPLOAD", "ENABLE_TENANT_CREATION", "MCP_ENABLED"],
  hostEnv: ENV,
  vaultEnvKey: "ENV",
  failOn: ENV === "production" || ENV === "staging" ? "missing" : "never",
  // logger defaults to consoleBootLogger (ANSI colors, NO_COLOR-respecting)
})

export const AppEnv = Try(() => ({
  ENV,
  SUPABASE_URL: config.get("SUPABASE_URL").orElse("https://test.supabase.co"),
  // ... rest of loadAll body, with config.get instead of loadVault
})).orThrow()
```

Post-2.0, the `Try` builder collapses to `Decoder.object({...})(config)` for accumulating typed validation — but that's an additive future swap.

For consumers already using `functype-log`:

```ts
import { createDirectConsoleLogger } from "functype-log/direct"
import type { Logger } from "functype"

const logger: Logger = createDirectConsoleLogger()  // structurally satisfies Logger

await bootDiagnostics({ ...opts, logger })
```

No adapter, no extra import surface. `DirectLogger` has `debug/info/warn/error(msg, meta?)` mandatory plus `trace/fatal/withError/withContext/child` extras — it's a superset of `Logger`, so it's freely assignable.

## Critical files

| File | Change |
|---|---|
| **`functype` core** | |
| `packages/functype/src/logger/Logger.ts` | NEW — 4-method interface (debug/info/warn/error), type-only |
| `packages/functype/src/logger/index.ts` | NEW — barrel; re-exports `Logger` type |
| `packages/functype/package.json` | MODIFY — add `"./logger"` subpath export |
| `packages/functype/test/logger/Logger.spec.ts` | NEW — minimal: type assignability tests (DirectLogger satisfies Logger; user `{debug,info,warn,error}` impl satisfies Logger) |
| `packages/functype/CLAUDE.md` | MODIFY — document `Logger` as ecosystem cross-cutting interface; rationale for why Clock/Random/Tracer are NOT being added |
| **`functype-os/config`** | |
| `packages/functype-os/src/config/ConfigSource.ts` | NEW — interface (`name` + `get(key)`) |
| `packages/functype-os/src/config/ProcessEnvSource.ts` | NEW — wraps existing `Env` |
| `packages/functype-os/src/config/StaticSource.ts` | NEW — in-memory map source |
| `packages/functype-os/src/config/Layered.ts` | NEW — first-wins composition |
| `packages/functype-os/src/config/consoleBootLogger.ts` | NEW — default impl typed as core `Logger`, uses internal colors |
| `packages/functype-os/src/config/colors.ts` | NEW (internal) — raw ANSI; respects NO_COLOR/FORCE_COLOR/isTTY |
| `packages/functype-os/src/config/mask.ts` | NEW — `maskValue` helper |
| `packages/functype-os/src/config/bootDiagnostics.ts` | NEW — orchestration + log block + fail-fast; logger field typed as core `Logger` |
| `packages/functype-os/src/config/index.ts` | NEW — barrel export (no `Logger` re-export — `Logger`'s home is `functype` core, reachable from `functype` or `functype/logger`) |
| `packages/functype-os/package.json` | MODIFY — add `"./config"` subpath export |
| `packages/functype-os/test/config/ConfigSource.spec.ts` | NEW — Layered precedence, source name composition, ProcessEnvSource via Env, StaticSource lookup |
| `packages/functype-os/test/config/bootDiagnostics.spec.ts` | NEW — happy path, missing required (Left), masking, env mismatch, failOn behavior; capture logs via test `Logger` |
| `packages/functype-os/test/config/colors.spec.ts` | NEW — NO_COLOR / FORCE_COLOR / isTTY behavior with `process.env` mocks |
| `packages/functype-os/CLAUDE.md` | MODIFY — document config module; reference core `Logger` import path; LogLayer interop pattern |
| **Release artifacts** | |
| `packages/functype/CHANGELOG.md` | MODIFY — 1.3.0 entry covering both core Logger + functype-os/config |

## Reuse

- **Existing typeclass-interface pattern in functype core** — `Functor`, `Monad`, `Foldable` are type-only contracts the ecosystem implements. `Logger` follows the same shape at a different abstraction layer (service-style instead of mathematical). Zero new patterns.
- **`Env` from `functype-os/env`** — `ProcessEnvSource` is a thin wrapper around `Env(key)`; no duplication of process.env lookup logic.
- **`Option`, `Either`, `List` from `functype`** — `ConfigSource.get` returns `Option`; `bootDiagnostics` returns `Either<List<MissingKey>, void>`; `Layered` composes via `Option.isSome()` short-circuit.
- **`DirectLogger` from `functype-log/direct`** — structurally satisfies core `Logger` (its `debug/info/warn/error(msg, meta?)` methods are a superset); zero-cost interop, no adapter file. Verified during proposal exploration: see `packages/functype-log/src/direct/DirectLogger.ts` lines 1–10.
- **Existing functype-os patterns** — error types as discriminated unions, `Object.assign`-style companion construction, barrel-only imports from `functype`. Follows the conventions documented in `packages/functype-os/CLAUDE.md`.

## Verification

1. `pnpm -F functype test test/logger/Logger.spec.ts` — type assignability tests: `const l: Logger = { debug, info, warn, error }` compiles; missing any of the 4 fails to compile; `DirectLogger` from `functype-log` assigns to `Logger`; `Logger` does NOT assign to `DirectLogger` (contravariance check).
2. `pnpm -F functype-os test test/config/ConfigSource.spec.ts` — `Layered([env, static])` precedence (env wins when present, falls through when None), composed source `name` reflects chain, `ProcessEnvSource` reads from `process.env`, `StaticSource` reads from passed map.
3. `pnpm -F functype-os test test/config/bootDiagnostics.spec.ts` — all-present case returns `Right`, missing required returns `Left(List<MissingKey>)`, captured log entries (via test `Logger` impl) contain masked sensitive values and raw public values, env mismatch produces error-level log entry, `failOn: "missing"` invokes `process.exit` (mocked).
4. `pnpm -F functype-os test test/config/colors.spec.ts` — `NO_COLOR` set → strings have no ANSI; `FORCE_COLOR` set → strings have ANSI even when non-TTY; default behavior matches `process.stdout.isTTY`.
5. `pnpm turbo run validate` — full workspace check including build, lint, typecheck, all tests across all 5 functype-* packages.
6. **Manual**: refactor `cq-api/src/AppEnv.ts` against the new API in a branch; diff the log output against the chalk-based version to confirm visual parity; verify behavior on `NO_COLOR=1`, in CI (non-TTY), and with `FORCE_COLOR=1`.
7. **Manual**: structural-compat sanity check — write a TS file that does `import type { Logger } from "functype/logger"` + `const l: Logger = createDirectConsoleLogger()` and confirm it compiles without an adapter or cast.
8. **`validate_code`** (functype MCP) on published 1.3.0 to confirm both `import type { Logger } from "functype/logger"` and `import { Layered, bootDiagnostics } from "functype-os/config"` resolve and types check.

## What's deliberately out of scope

- **`Clock`, `Random`, `Tracer`, or other service-style interfaces in core.** Logger is the only one being added because every production TS app already has one — naming an existing concept, not introducing a new one. The other services are framework-style abstractions (Effect ships them; functype shouldn't follow). If a real use case emerges for any of them, propose individually; do NOT preempt.
- **Concrete `Logger` implementation in `functype` core.** Default impl belongs in the consumer package (`consoleBootLogger` in `functype-os/config`). Core stays pure types — no `console` global dependency, no opinion on output format, no Bun/Deno/edge-runtime portability questions.
- **Restricting `Logger` to subpath-only access.** Decision reversed during impl: `Logger` IS reachable from the top-level barrel, matching the workspace convention every other functype type follows. Restricting `Logger` to the subpath would make it the only outlier in the public surface. Collision with user-defined `Logger` types is handled by TS-standard `import type { Logger as FunctypeLogger }`.
- **`Logger.child()` / `withContext()` / `withError()` methods.** Not all loggers have them; richer loggers (`DirectLogger`) add them on top and remain assignable to `Logger`. Standard contravariance.
- **`trace` / `fatal` methods.** Half of loggers don't have these; debug covers the lower tier, error covers the upper. Adding them would force every minimal impl to write more no-ops than it should.
- **`bootLoggerFromLogLayer` adapter.** Unnecessary cross-package edge — structural typing handles it. `DirectLogger` IS a `Logger`.
- **Vault SDK adapters** (Infisical, Doppler, Vault, AWS Secrets Manager, 1Password). `ConfigSource` interface IS the plugin point. Community packages or in-app ~12-line adapters. functype never takes peer deps on third-party services.
- **`DotenvSource`.** `dotenv` is well-known, 5 lines to wrap (`import "dotenv/config"`), wrapping adds no value.
- **Hot-reload / config-watching / TTL refresh.** Separate concern; would warrant a `RefreshableSource` extending `ConfigSource` if asked. Reserve `functype-config` package name for that future work.
- **Typed constants builder.** That's `Decoder.object` from 2.0 — composes naturally with `ConfigSource` (`Decoder.object({...})(config)`). Keep separation of concerns.
- **Secret rotation, key versioning, audit logging.** Out of scope; envpkt or similar tooling handles those concerns.
- **`failOn: "warning"` mode** (warn on missing optional keys). Not in v1; add if requested. v1 is binary: required-missing fails (when `failOn: "missing"`) or returns `Left`; everything else is a log line.
- **Encrypted at-rest config storage.** Operating-system keyring integration; out of scope.

## Release notes outline

```
Minor (functype family 1.3.0):

NEW in `functype` core:
- `functype/logger` subpath: minimal `Logger` interface (type-only, no implementation).
  - 4 methods: debug, info, warn, error — all mandatory.
  - Signature: (message: string, metadata?: Record<string, unknown>) => void
  - Reachable from both the top-level `functype` barrel AND the `functype/logger` subpath. Workspace-convention parity with every other functype type; collision with user `Logger` types handled by `import type { Logger as FunctypeLogger }`.
  - Shared shape for all functype packages and consumer code.
  - DirectLogger from functype-log structurally satisfies it; no adapter required.

NEW in `functype-os`:
- `functype-os/config` subpath: multi-source config coordination + standardized boot diagnostics.
  - `ConfigSource` interface — uniform `(key) => Option<string>` contract for env, vault, defaults, or any user-written source.
  - `ProcessEnvSource()` — wraps existing `Env`.
  - `StaticSource(entries, name?)` — in-memory map source for defaults / test fixtures.
  - `Layered([sources])` — first-wins composition; composed source's `name` reflects resolution chain.
  - `consoleBootLogger` (typed as core `Logger`) — default impl; raw ANSI; respects NO_COLOR / FORCE_COLOR / isTTY.
  - `bootDiagnostics({source, required, sensitive, public, hostEnv, vaultEnvKey, failOn, logger, serviceName})` —
    returns `Either<List<MissingKey>, void>`; logs the standardized block; `failOn: "missing"` triggers `process.exit(1)`.
    The `logger` option accepts any core `Logger` impl (defaults to `consoleBootLogger`).
  - `maskValue(s)` — secret-display helper, exported for ad-hoc masking.
- Zero new runtime deps. Vault adapters (Infisical, Doppler, Vault, etc.) are user-written / community packages
  satisfying `ConfigSource`.

NEW in `functype-log` (optional doc update only):
- README note: `DirectLogger` structurally satisfies core `Logger` from `functype/logger` — pass
  `createDirectConsoleLogger()` directly anywhere a `Logger` is expected, no adapter.

UNCHANGED:
- All existing functype core types and subpaths (Option, Either, IO, List, etc.).
- `functype-os/env` — `Env(name)`, `Env.get`, `Env.getRequired`, `Env.parse` keep current API.
- All other `functype-os` subpaths (`fs`, `path`, `platform`, `process`, `errors`).
- All `functype-log`, `functype-react`, `functype-mcp-server` APIs.
```

## Release sequencing

Cuts via the family-cadence release flow (`pnpm release minor`). All 5 `functype-*` packages bump to 1.3.0 together per the workspace convention; eslint packages mirror to 2.103.0. Changes touch two packages (`functype` core for `Logger`, `functype-os` for `config`), but the family-bump keeps version alignment for downstream consumers either way — adding the core `Logger` is essentially free in the same release because the family bumps together regardless.

Implementation order suggestion within the same PR:
1. Land `functype/logger` first (smallest, isolated, no behavior).
2. Land `functype-os/config` referencing core `Logger`.
3. Add the docs-only `functype-log` README note.
4. Manual refactor of `cq-api/AppEnv.ts` against the new API (separate branch, separate PR — proves the API).

No coordination with the 2.0 HTTP wire-format proposal — they're independent. Ship 1.3 whenever ready; 2.0 follows on its own timeline.
