import type { Option } from "functype"

/**
 * Uniform contract for config lookup.
 *
 * Any value satisfying `get: (key: string) => Option<string>` is a `ConfigSource`.
 * The same shape covers `process.env`, secrets fetched from a vault, static
 * defaults, file-based config, or any user-written adapter.
 *
 * Synchronous lookup by design — async work (vault auth, secret fetching)
 * happens at construction time. Once a `ConfigSource` exists, `get` returns
 * an `Option<string>` without blocking.
 *
 * `name` is the source identifier shown in `bootDiagnostics` headers and in
 * the composed name returned by `Layered`.
 *
 * @example
 * ```ts
 * // User-written vault adapter (~12 lines, no SDK ships from functype):
 * const InfisicalSource = async (opts: { token: string; env: string }): Promise<ConfigSource> => {
 *   const client = new InfisicalSDK().auth().accessToken(opts.token)
 *   const result = await client.secrets().listSecrets({ environment: opts.env })
 *   const map = new Map((result.secrets ?? []).map((s) => [s.secretKey, s.secretValue]))
 *   return { name: "infisical", get: (key) => Option(map.get(key)) }
 * }
 * ```
 */
export interface ConfigSource {
  readonly name: string
  get(key: string): Option<string>
}
