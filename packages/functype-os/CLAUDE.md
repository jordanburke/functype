# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

functype-os is a standalone npm package that wraps Node.js OS operations using functype data structures (Option, Either, Task, List). It provides functional interfaces for env vars, path expansion, filesystem ops, platform/container detection, and config file resolution.

## Quick Start

- **Prerequisites**: Node.js >= 18.17, pnpm 10.x
- **Install**: `pnpm install`
- **Development**: `pnpm dev`
- **Before commit**: `pnpm validate` (format + lint + typecheck + test + build)
- **Test**: `pnpm test` or `pnpm vitest run test/specific.spec.ts`

## Architecture

### Module Structure

```
src/
├── errors/     # Discriminated union error types (EnvError, PathError, FsError, ConfigError, ProcessError)
├── env/        # Env("VAR") → Option, Env.getRequired() → Either, Env.parse() → Either
├── path/       # expandTilde, expandVars, expandPath — pure sync functions
├── fs/         # Fs.exists, readFile, writeFile, mkdir, unlink, stat, copyFile, rename, glob → TaskResult
├── platform/   # OS detection + container runtime detection (lazy-cached)
├── config/     # ConfigResolver (file-path resolution) + ConfigSource/Layered/bootDiagnostics (1.3.0+, multi-source boot config)
├── process/    # Process.exec, Process.execSync → TaskResult/Either<ProcessError, ExecResult>
└── index.ts    # Barrel export
```

### Design Decisions

| Decision            | Choice                   | Rationale                                                                                          |
| ------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| Async wrapper       | Task (Ok/Err)            | The "environment" IS the OS — nothing to inject. Task is simpler than IO.                          |
| Path ops            | Pure functions → Either  | Tilde/var expansion is sync string manipulation. Only FS ops need Task.                            |
| Error types         | Discriminated unions     | Enables exhaustive matching via `_tag`.                                                            |
| Container detection | Lazy-cached sync         | Follows sindresorhus/is-docker pattern.                                                            |
| functype imports    | Barrel `"functype"` only | Subpath exports (`functype/task`, `functype/either`) don't resolve correctly in published package. |

### Key Patterns

- **All imports from functype use the barrel export** — do NOT use subpath imports like `functype/task`
- **Error types** are both types and constructor functions (same name, different namespaces)
- **Env** uses `Object.assign` to combine constructor + companion (not `Companion()` from functype, since this is a standalone package)
- **Platform container checks** use module-level cached variables with nullish coalescing assignment (`??=`)

## Dependencies

- **Zero runtime deps** — only `functype` as peer dependency
- **Dev deps**: `functype`, `ts-builds`, `tsdown`, `vitest`

## Code Style

- TypeScript strict mode via ts-builds tsconfig
- Prettier config from ts-builds
- ESLint config from ts-builds
- No `any` types — use `unknown` or proper typing
- Type-only imports where possible (`import type`)

## Testing

- Tests live in `test/` mirroring `src/` structure
- Env tests: mock `process.env`, clean up after
- Path tests: use known env vars and OS homedir
- Fs tests: create real temp files in `os.tmpdir()`
- Platform tests: verify return types (booleans, non-empty strings)
- Config tests: create temp files, test first-found semantics

## Adding New Functionality

1. Create module directory under `src/`
2. Define error type in `src/errors/errors.ts` if needed
3. Implement using functype types (Option, Either, Task, List)
4. Export from module `index.ts` and `src/index.ts`
5. Add subpath export to `package.json` exports field
6. Write tests in `test/`
7. Run `pnpm validate`

## `config` module (1.3.0+)

The `config/` subpath hosts two distinct sets of utilities — kept together because both deal with "where does the app's config come from at boot":

1. **`ConfigResolver`** (pre-1.3) — find the first existing config file from a candidate list. File-path resolution only.
2. **`ConfigSource` ecosystem** (1.3.0+) — multi-source config lookup with first-wins precedence + standardized boot diagnostics.

### ConfigSource ecosystem surface

```
ConfigSource           - interface: { name: string, get(key): Option<string> }
ProcessEnvSource()     - wraps Env (process.env)
StaticSource(map, name?) - in-memory map source for defaults / test fixtures
Layered([sources])     - first-wins composition; composed name = "s1 > s2 > s3"
consoleBootLogger      - default Logger impl, raw ANSI, NO_COLOR/FORCE_COLOR/isTTY-respecting
maskValue(s)           - "****" for ≤8 chars; "ab****yz" for longer
bootDiagnostics(opts)  - standardized log block + fail-fast; returns Either<List<MissingKey>, void>
```

### Logger interop

`bootDiagnostics`' `logger` option is typed as `Logger` from `functype` (core, type-only — see `functype/logger` subpath). Defaults to `consoleBootLogger`. Consumers using `functype-log` pass `createDirectConsoleLogger()` directly — `DirectLogger` structurally satisfies `Logger`, no adapter required.

### Vault adapters are NOT shipped

`ConfigSource` IS the plugin point. Infisical/Doppler/Vault/AWS-Secrets-Manager adapters are user-written (~12 lines) or community packages. `functype-os` takes no peer deps on third-party services — keeps the package's release cadence independent of SDK churn.

## Phase 3 (Future)

- Branded types: `AbsolutePath`, `RelativePath` via functype `Brand`
- `Fs.watch` — file watching
