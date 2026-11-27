import { createRequire } from "node:module"

import type { ESLint, Linter } from "eslint"

import {
  createValidationError,
  shouldValidateDependencies,
  validatePeerDependencies,
} from "../utils/dependency-validator"

// Check the peers before loading them, so a missing one gets the install command, not a bare
// "Cannot find module". A static import would fail at link time, before this check could run.
if (shouldValidateDependencies()) {
  const result = validatePeerDependencies()
  if (!result.isValid) {
    throw createValidationError(result)
  }

  if (result.warnings.length > 0) {
    console.warn("\n⚠️  eslint-config-functype warnings:")
    result.warnings.forEach((warning) => console.warn(`   ${warning}`))
    console.warn("")
  }
}

/**
 * ESLint's plugin type. An interface, not an alias: the presets' .d.ts can name an interface, while
 * an alias is expanded to a type in @eslint/core, which a consumer may not be able to resolve.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Plugin extends ESLint.Plugin {}

const require = createRequire(import.meta.url)

/**
 * Load a peer as a consumer's `import x from "name"` would. The peers are CommonJS, so this is the
 * same object, and ESLint accepts the same plugin registered twice. An ES module peer comes back as
 * its namespace, so take its default export.
 */
const load = <T>(name: string): T => {
  const mod = require(name) as { readonly default?: T; readonly [Symbol.toStringTag]?: string }
  return (mod[Symbol.toStringTag] === "Module" ? mod.default : mod) as T
}

/** The files the presets lint: TypeScript in every module flavour. */
export const typescriptFiles = ["**/*.{ts,tsx,mts,cts}"]

/** Every plugin whose rules the presets set. */
export const plugins: Record<string, Plugin> = {
  "@typescript-eslint": load<Plugin>("@typescript-eslint/eslint-plugin"),
  prettier: load<Plugin>("eslint-plugin-prettier"),
  "simple-import-sort": load<Plugin>("eslint-plugin-simple-import-sort"),
}

/**
 * The TypeScript parser, with type information: `no-floating-promises` and the other type-aware
 * rules need it. `projectService` finds each file's nearest tsconfig.json.
 */
export const languageOptions: Linter.LanguageOptions = {
  parser: load<Linter.Parser>("@typescript-eslint/parser"),
  parserOptions: { projectService: true },
}
