import { Option } from "functype"

import type { ConfigSource } from "./ConfigSource"

/**
 * Built-in `ConfigSource` backed by an in-memory map.
 *
 * Useful for default values, test fixtures, or any static config layer that
 * doesn't need an external lookup. The `name` argument defaults to `"static"`
 * but should be set when composing multiple static sources for clearer
 * diagnostics output.
 *
 * @example
 * ```ts
 * const defaults = StaticSource({ ENV: "local", PORT: "3000" }, "defaults")
 * const config = Layered([ProcessEnvSource(), defaults])
 * ```
 */
export const StaticSource = (entries: Readonly<Record<string, string>>, name = "static"): ConfigSource => ({
  name,
  get: (key) => Option(entries[key]),
})
