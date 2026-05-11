#!/usr/bin/env node

declare const __VERSION__: string

if (!process.env.TRANSPORT_TYPE) {
  process.env.TRANSPORT_TYPE = "stdio"
}

const args = process.argv.slice(2)

if (args.includes("--version") || args.includes("-v")) {
  console.log(__VERSION__)
  process.exit(0)
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
functype-mcp-server v${__VERSION__}

MCP server for functype documentation lookup and TypeScript code validation.

Usage: functype-mcp-server [options]

Options:
  -v, --version        Show version number
  -h, --help           Show help

Environment Variables:
  TRANSPORT_TYPE        Transport mode: "stdio" (default) or "httpStream"
  PORT                  HTTP port (default: 3000)
  HOST                  HTTP host (default: 0.0.0.0)

Tools:
  search_docs           Search functype documentation
  get_type_api          Get detailed type API reference
  get_interfaces        Get interface hierarchy
  validate_code         Type-check functype code snippets

For more information: https://github.com/jordanburke/functype/tree/main/mcp-server
`)
  process.exit(0)
}

async function main() {
  await import("./index.js")
}

main().then()
