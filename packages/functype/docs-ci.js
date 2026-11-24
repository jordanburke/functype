#!/usr/bin/env node

// Builds the API docs with TypeDoc. TypeDoc writes only to ./typedocs (see
// typedoc.config.mjs), so nothing under ./docs needs protecting.
import { execSync } from "child_process"

try {
  execSync("npm config set browser false", { stdio: "inherit" })
} catch (error) {
  console.warn("⚠️  Could not set npm browser config:", error)
}

try {
  console.log("Building documentation with TypeDoc...")
  execSync("npx typedoc", { stdio: "inherit" })
  console.log("Documentation generated successfully in ./typedocs directory")
} catch (error) {
  console.error("Error building documentation:", error)
  process.exit(1)
}
