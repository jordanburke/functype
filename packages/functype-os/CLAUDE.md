# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

functype-os is a standalone npm package that wraps Node.js OS operations using functype data structures (Option, Either, Task, List). It provides functional interfaces for env vars, path expansion, filesystem ops, platform/container detection, and config file resolution.

## Quick Start

- **Prerequisites**: Node.js >= 18, pnpm 10.x
- **Install**: `pnpm install`
- **Development**: `pnpm dev`
- **Before commit**: `pnpm validate` (format + lint + typecheck + test + build)
- **Test**: `pnpm test` or `pnpm vitest run test/specific.spec.ts`

## Architecture

### Module Structure

```
src/
├── errors/     # Discriminated union error types (EnvError, PathError, FsError, ConfigError)
├── env/        # Env("VAR") → Option, Env.getRequired() → Either
├── path/       # expandTilde, expandVars, expandPath — pure sync functions
├── fs/         # Fs.exists, readFile, readFileOpt, readdir → TaskResult
├── platform/   # OS detection + container runtime detection (lazy-cached)
├── config/     # ConfigResolver — find first existing config from candidates
└── index.ts    # Barrel export
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Async wrapper | Task (Ok/Err) | The "environment" IS the OS — nothing to inject. Task is simpler than IO. |
| Path ops | Pure functions → Either | Tilde/var expansion is sync string manipulation. Only FS ops need Task. |
| Error types | Discriminated unions | Enables exhaustive matching via `_tag`. |
| Container detection | Lazy-cached sync | Follows sindresorhus/is-docker pattern. |
| functype imports | Barrel `"functype"` only | Subpath exports (`functype/task`, `functype/either`) don't resolve correctly in published package. |

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

## Phase 2 (Future)

- `Fs.writeFile`, `Fs.mkdir`, `Fs.unlink`
- `Fs.stat → TaskResult<FileInfo>`
- Branded types: `AbsolutePath`, `RelativePath` via functype `Brand`
- `Process.exec → TaskResult<ExecResult>`
- `Fs.watch` — file watching