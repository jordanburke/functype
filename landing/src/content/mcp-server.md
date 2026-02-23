# MCP Server

Live documentation and code validation for any AI agent.

## Overview

The functype MCP server gives AI coding assistants direct access to functype's documentation, type APIs, and a compile-time code validator. Instead of relying on training data that may be outdated, your AI tools get live, accurate information from the library itself.

It works with any tool that supports the [Model Context Protocol](https://modelcontextprotocol.io/) — Claude Code, Cursor, Windsurf, and more.

## Setup

Add the MCP server to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "functype": {
      "command": "npx",
      "args": ["-y", "functype-mcp-server"]
    }
  }
}
```

The server is installed automatically via npx — no global installation needed.

## Tools

The MCP server provides 5 tools:

### search_docs

Browse all functype types or search by keyword. Call with no arguments for a full overview of every type and its implemented interfaces.

**Example output:**

```
Option [Functor, Monad, Foldable, Extractable, Matchable, Serializable, Traversable]
  Safe nullable handling - Some<T> or None

Either [Functor, Monad, Foldable, Traversable, PromiseLike]
  Error handling with Left (error) or Right (success)

List [Functor, Monad, Foldable, Collection, Serializable, Traversable]
  Immutable array with functional operations
```

### get_type_api

Get detailed API reference for any type, organized by category: Create, Transform, Extract, Check.

**Example** — `get_type_api("Option")`:

```
Option<T> [Functor, Monad, Foldable, Extractable, Matchable, Serializable, Traversable]

Create:    Option(v), Option.none(), Some(v), None()
Transform: .map(f), .flatMap(f), .filter(p), .ap(ff)
Extract:   .fold(n, s), .orElse(d), .orThrow(), .orNull(), .match({Some, None})
Check:     .isSome, .isNone, .isDefined, .isEmpty
```

### get_interfaces

Get the full interface hierarchy — Functor, Monad, Foldable, Extractable, Matchable, and more — with their method signatures and inheritance relationships.

**Example output:**

```
Functor<A>        .map<B>(f: A => B): Functor<B>
Monad<A>          .flatMap<B>(f: A => Monad<B>): Monad<B>
Foldable<A>       .fold<B>(empty: () => B, f: A => B): B
Extractable<A>    .orElse(d: T): T
Matchable<A>      .match<R>(patterns): R
```

### validate_code

Type-check functype code snippets against the TypeScript compiler. Catches type errors before code is presented or committed. Supports auto-importing all functype types.

**Example** — valid code:

```typescript
const result = Option(42)
  .map((x) => x * 2)
  .flatMap((x) => (x > 50 ? Option(x) : Option.none<number>()))
  .fold(
    () => "nothing",
    (x) => `got ${x}`,
  )
// Validation PASSED
```

**Example** — invalid code:

```typescript
const result = Option(42)
  .map((x) => x * 2)
  .flatMap((x) => (x > 50 ? Option(x) : Option.none()))
// Validation FAILED — Option.none() without type parameter
// creates Option<unknown>, incompatible with Option<number>
```

### set_functype_version

Switch the functype version at runtime. Installs the specified version and reloads all documentation and type definitions. Useful for working with projects pinned to older versions.

**Example:** `set_functype_version("0.46.0")`

## Compatibility

The functype MCP server works with any tool that supports the Model Context Protocol:

| Tool           | Status    |
| -------------- | --------- |
| Claude Code    | Supported |
| Cursor         | Supported |
| Windsurf       | Supported |
| Any MCP client | Supported |
