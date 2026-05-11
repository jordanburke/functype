# functype-mcp-server

MCP server for [functype](https://github.com/jordanburke/functype) — documentation lookup and compile-time TypeScript code validation for AI editors.

This package is part of the [functype monorepo](https://github.com/jordanburke/functype).

## Features

- **`search_docs`** — Search functype documentation by keyword or type name
- **`get_type_api`** — Detailed API reference for any type (Option, Either, List, IO, etc.)
- **`get_interfaces`** — Interface hierarchy (Functor, Monad, Foldable, Extractable, etc.)
- **`validate_code`** — Type-check functype code snippets using the TypeScript Compiler API
- **`set_functype_version`** — Switch functype version at runtime (installs + reloads docs and types)

The `validate_code` tool is the killer feature: an LLM writes functype code, calls the tool, gets back type errors, and fixes them before showing the user.

## Installation

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "functype": {
      "command": "npx",
      "args": ["functype-mcp-server"]
    }
  }
}
```

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "functype": {
      "command": "npx",
      "args": ["functype-mcp-server"]
    }
  }
}
```

### From Source

```bash
git clone https://github.com/jordanburke/functype.git
cd functype/mcp-server
pnpm install
pnpm build
```

Then configure your MCP client to use `node dist/bin.js`.

## Tools

### `search_docs`

Search functype documentation. Omit query for a full overview.

```
query?: string  — Type name or keyword (e.g., "Option", "map", "Foldable")
```

### `get_type_api`

Get detailed API reference for a specific type.

```
type_name: string              — e.g., "Option", "Either", "List", "IO"
include_full_interface?: bool  — Include full TypeScript interface definition
```

### `get_interfaces`

Get the interface hierarchy — Functor, Monad, Foldable, Extractable, etc.

No parameters.

### `validate_code`

Type-check a functype code snippet using the TypeScript compiler.

```
code: string          — TypeScript code to validate
auto_import?: bool    — Auto-import functype types if no import present (default: true)
```

Returns `Validation PASSED` or a list of errors with line, column, message, and TS error code.

### `set_functype_version`

Switch the functype version at runtime. Installs the specified version and reloads all documentation and type definitions.

```
version: string  — Version to install (e.g., "0.47.0", "latest", ...)
```

Requires functype >= 0.47.0 for full documentation support. Older versions will still work for type-checking via `validate_code`.

## Environment Variables

| Variable         | Default   | Description                             |
| ---------------- | --------- | --------------------------------------- |
| `TRANSPORT_TYPE` | `stdio`   | Transport mode: `stdio` or `httpStream` |
| `PORT`           | `3000`    | HTTP port (when using httpStream)       |
| `HOST`           | `0.0.0.0` | HTTP host (when using httpStream)       |

## Development

```bash
pnpm validate          # format + lint + typecheck + test + build
pnpm test              # Run tests
pnpm inspect           # Build + launch MCP Inspector
pnpm serve:dev         # Dev server with tsx watch
```

## License

MIT
