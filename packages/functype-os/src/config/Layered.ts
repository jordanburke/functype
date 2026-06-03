import type { Option } from "functype"
import { Option as OptionCtor } from "functype"

import type { ConfigSource } from "./ConfigSource"

/**
 * First-wins composition over N `ConfigSource`s.
 *
 * Lookup walks the sources in order and returns the first `Some(value)` it
 * finds. Falls through to the next source when one returns `None`. The
 * composed source's `name` reflects the resolution chain
 * (e.g. `"process.env > infisical > defaults"`) so `bootDiagnostics` can echo
 * it in its header.
 *
 * Sensitivity (which keys to mask) is declared at diagnostics time, not at
 * source time — a `Layered([env, vault])` is structurally identical to any
 * other `ConfigSource`.
 *
 * @example
 * ```ts
 * const config = Layered([
 *   ProcessEnvSource(),
 *   await InfisicalSource({ token, env, projectId }),
 *   StaticSource({ ENV: "local" }, "defaults"),
 * ])
 * // config.name === "process.env > infisical > defaults"
 * ```
 */
export const Layered = (sources: readonly ConfigSource[]): ConfigSource => ({
  name: sources.map((s) => s.name).join(" > "),
  get: (key) =>
    sources.reduce<Option<string>>(
      (acc, source) =>
        acc.fold(
          () => source.get(key),
          () => acc,
        ),
      OptionCtor<string>(undefined),
    ),
})
