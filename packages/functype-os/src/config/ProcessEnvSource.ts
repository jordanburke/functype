import { Env } from "../env/Env"
import type { ConfigSource } from "./ConfigSource"

/**
 * Built-in `ConfigSource` backed by `process.env` via the existing `Env` wrapper.
 *
 * Use as the first layer of a `Layered` chain so env vars override vault and
 * default values:
 *
 * ```ts
 * const config = Layered([ProcessEnvSource(), await InfisicalSource(...), StaticSource(defaults)])
 * ```
 */
export const ProcessEnvSource = (): ConfigSource => ({
  name: "process.env",
  get: (key) => Env(key),
})
