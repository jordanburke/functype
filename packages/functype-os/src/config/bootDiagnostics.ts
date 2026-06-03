import type { Either, List as ListType, Logger } from "functype"
import { Left, List, Right } from "functype"

import { blue, green, magenta, red, yellow } from "./colors"
import type { ConfigSource } from "./ConfigSource"
import { consoleBootLogger } from "./consoleBootLogger"
import { maskValue } from "./mask"

export interface MissingKey {
  readonly key: string
  readonly required: boolean
}

export interface BootDiagnosticsOptions {
  /** The composed `ConfigSource` to inspect. */
  readonly source: ConfigSource
  /** Keys that MUST be present. Missing required keys produce a `Left`. */
  readonly required?: readonly string[]
  /** Keys to log with masked values (via {@link maskValue}). */
  readonly sensitive?: readonly string[]
  /** Keys to log with raw values. */
  readonly public?: readonly string[]
  /**
   * If provided with `vaultEnvKey`, compares the host environment string
   * (e.g. `process.env.NODE_ENV`) against the value at `vaultEnvKey` in the
   * source. Logs `✓` on match, an error-level message on mismatch.
   */
  readonly hostEnv?: string
  readonly vaultEnvKey?: string
  /**
   * `"missing"` triggers `process.exit(1)` after logging when any required key
   * is missing. `"never"` (default) returns `Left(missing)` and lets the caller
   * decide. Set to `"missing"` in production / staging boot paths to guarantee
   * fail-fast on misconfiguration.
   */
  readonly failOn?: "missing" | "never"
  /**
   * Logger to use. Defaults to {@link consoleBootLogger}. Any value satisfying
   * the core `Logger` interface from `functype` — including `DirectLogger`
   * from `functype-log/direct` — works without an adapter.
   */
  readonly logger?: Logger
  /** Service identifier shown in the diagnostics header. */
  readonly serviceName?: string
}

/**
 * Log a standardized boot diagnostics block and verify required-key presence.
 *
 * The block always emits, regardless of outcome — operational visibility ("did
 * the deploy pick up my config?") is the point. Sensitive keys are masked;
 * public keys are logged verbatim. An optional host-vs-vault env-mismatch
 * check catches the common deploy footgun where the host's `NODE_ENV` and the
 * vault's `ENV` (or equivalent) diverge.
 *
 * Returns `Either<List<MissingKey>, void>` so non-fatal callers can inspect
 * the result. Setting `failOn: "missing"` short-circuits to `process.exit(1)`
 * for production guards.
 *
 * @example
 * ```ts
 * const result = bootDiagnostics({
 *   serviceName: "cq-api",
 *   source: Layered([ProcessEnvSource(), await InfisicalSource(...)]),
 *   required: ["SUPABASE_URL", "SUPABASE_KEY", "OPENAI_API_KEY"],
 *   sensitive: ["SUPABASE_URL", "SUPABASE_KEY", "OPENAI_API_KEY"],
 *   public: ["ENV", "ENABLE_CHAT"],
 *   hostEnv: process.env.NODE_ENV ?? "local",
 *   vaultEnvKey: "ENV",
 *   failOn: process.env.NODE_ENV === "production" ? "missing" : "never",
 * })
 * ```
 */
export const bootDiagnostics = (opts: BootDiagnosticsOptions): Either<ListType<MissingKey>, void> => {
  const logger = opts.logger ?? consoleBootLogger
  const required = opts.required ?? []
  const sensitive = opts.sensitive ?? []
  const publicKeys = opts.public ?? []

  logger.info(`${blue("📦")} Boot diagnostics: ${opts.serviceName ?? "service"}`)
  logger.info(`   source: ${opts.source.name}`)

  const missing = required.filter((k) => opts.source.get(k).isEmpty)

  if (sensitive.length > 0) {
    logger.info(yellow("🔐 Sensitive:"))
    for (const key of sensitive) {
      const value = opts.source.get(key)
      const display = value.fold(
        () => red("NOT_LOADED"),
        (v) => maskValue(v),
      )
      logger.info(`   ${key.padEnd(28)} ${display}`)
    }
  }

  if (publicKeys.length > 0) {
    logger.info(green("⚙️  Public:"))
    for (const key of publicKeys) {
      const value = opts.source.get(key)
      const display = value.fold(
        () => red("NOT_LOADED"),
        (v) => v,
      )
      logger.info(`   ${key.padEnd(28)} ${display}`)
    }
  }

  if (opts.hostEnv !== undefined && opts.vaultEnvKey !== undefined) {
    const vaultEnv = opts.source.get(opts.vaultEnvKey)
    const { hostEnv } = opts
    const { vaultEnvKey } = opts
    vaultEnv.fold(
      () => {
        logger.warn(`Vault env key '${vaultEnvKey}' not present — skipping mismatch check`)
        return undefined
      },
      (v) => {
        if (v === hostEnv) {
          logger.info(`${magenta("🌍")} Environment: ${hostEnv} (host) ↔ ${v} (vault) ${green("✓")}`)
        } else {
          logger.error(`${magenta("🌍")} Environment MISMATCH: host=${hostEnv} vault=${v}`, {
            hostEnv,
            vaultEnv: v,
          })
        }
        return undefined
      },
    )
  }

  if (missing.length === 0) {
    logger.info(green("✅ All required keys present"))
    return Right<ListType<MissingKey>, void>(undefined)
  }

  logger.error(red(`❌ Missing required keys (${missing.length}):`))
  for (const key of missing) logger.error(`   ${key}`)

  const missingList = List(missing.map((key): MissingKey => ({ key, required: true })))

  if (opts.failOn === "missing") {
    process.exit(1)
  }
  return Left<ListType<MissingKey>, void>(missingList)
}
