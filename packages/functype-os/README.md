# functype-os

Functional OS utilities for Node.js using [functype](https://github.com/jordanburke/functype) data structures. Wraps environment variables, path expansion, filesystem operations, platform detection, and config file resolution with `Option`, `Either`, `Task`, and `List`.

## Install

```bash
pnpm add functype-os functype
```

## Modules

### Env

Wraps `process.env` with `Option` and `Either`.

```typescript
import { Env } from "functype-os"

Env("HOME") // Option<string>
Env.get("HOME") // Option<string>
Env.getRequired("DATABASE_URL") // Either<EnvError, string>
Env.getOrDefault("PORT", "3000") // string
Env.has("CI") // boolean
Env.entries() // List<readonly [string, string]>
```

### Path

Pure path expansion — tilde, environment variables, and resolution.

```typescript
import { expandTilde, expandVars, expandPath, Path } from "functype-os"

expandTilde("~/Documents") // "/home/user/Documents"
expandVars("$HOME/.config") // Either<PathError, string>
expandPath("~/$APP_DIR/config.toml") // Either<PathError, string> (absolute)

Path.join("a", "b") // "a/b"
Path.resolve("relative") // "/cwd/relative"
Path.dirname("/a/b/c.txt") // "/a/b"
Path.basename("/a/b/c.txt") // "c.txt"
Path.extname("file.ts") // ".ts"
Path.isAbsolute("/abs") // true
```

### Fs

Async filesystem operations returning `TaskResult`.

```typescript
import { Fs } from "functype-os"

await Fs.exists("/path/to/file") // TaskResult<boolean>
await Fs.readFile("/path/to/file") // TaskResult<string>
await Fs.readFileOpt("/path/to/file") // TaskResult<Option<string>> (None on ENOENT)
await Fs.readdir("/path/to/dir") // TaskResult<List<string>>
```

### Platform

OS and container/runtime detection with lazy-cached sync checks.

```typescript
import { Platform } from "functype-os"

Platform.os() // "darwin" | "linux" | "win32" | string
Platform.arch() // "arm64" | "x64" | ...
Platform.homeDir() // "/home/user"
Platform.isWindows() // boolean
Platform.isMac() // boolean
Platform.isLinux() // boolean
Platform.userInfo() // Option<UserInfo>

// Container/runtime detection (lazy-cached)
Platform.isDocker() // boolean
Platform.isKubernetes() // boolean
Platform.isWSL() // boolean
Platform.isCI() // boolean
Platform.isContainer() // isDocker() || isKubernetes()
```

### ConfigResolver

Find the first existing config file from a list of candidates with path expansion.

```typescript
import { ConfigResolver } from "functype-os"

const config = await ConfigResolver.resolve({
  candidates: ["./app.toml", "~/.config/app/config.toml", "$APPDATA/app/config.toml"],
})
// TaskResult<Option<string>> — Ok(Some("/home/user/.config/app/config.toml"))

const required = await ConfigResolver.resolveRequired({
  candidates: ["./app.toml", "~/.config/app/config.toml"],
})
// TaskResult<string> — Err(ConfigError) if none found

const all = await ConfigResolver.resolveAll({
  candidates: ["./a.toml", "./b.toml", "./c.toml"],
})
// TaskResult<List<string>> — all existing paths
```

### Errors

Discriminated union error types for exhaustive matching.

```typescript
import type { OsError } from "functype-os"
import { EnvError, PathError, FsError, ConfigError } from "functype-os"

const handleError = (error: OsError) => {
  switch (error._tag) {
    case "EnvError":
      return `Missing env var: ${error.variable}`
    case "PathError":
      return `Path issue: ${error.path} (${error.reason})`
    case "FsError":
      return `FS error: ${error.operation} on ${error.path}`
    case "ConfigError":
      return `No config found in: ${error.candidates.join(", ")}`
  }
}
```

## Requirements

- Node.js >= 18
- `functype` >= 0.49.0 (peer dependency)

## Development

```bash
pnpm install
pnpm dev              # build with watch
pnpm test             # run tests
pnpm validate         # format + lint + typecheck + test + build
```

## License

MIT
