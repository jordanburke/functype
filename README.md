# functype monorepo

This repository hosts the functype family of TypeScript functional programming libraries.

## Packages

| Package | Description | npm |
|---|---|---|
| [`functype`](./packages/functype) | Core FP library: Option, Either, Try, List, Set, Map, IO, Task, Match, Cond, and more | `functype` |
| [`functype-os`](./packages/functype-os) | OS utilities (env vars, paths, file ops, platform detection) | `functype-os` |
| [`functype-log`](./packages/functype-log) | IO-native logging wrapping LogLayer with Tag/Layer DI | `functype-log` |
| [`functype-react`](./packages/functype-react) | React bindings (in progress) | `functype-react` |
| [`functype-mcp-server`](./packages/mcp-server) | MCP server for functype documentation lookup and code validation | `functype-mcp-server` |

The Astro documentation site lives in [`site/`](./site).

## Development

```bash
pnpm install
pnpm validate            # format + lint + test + build across all packages
pnpm -F functype test    # run tests for a single package
pnpm -F functype-react dev
```

See each package's own README and CLAUDE.md for package-specific guidance.

## License

MIT — see [LICENSE](./LICENSE).
