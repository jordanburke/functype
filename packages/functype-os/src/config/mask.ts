/**
 * Mask a sensitive value for display in boot diagnostics or logs.
 *
 * - Values ≤ 8 characters become `****` (no leakage of length or characters).
 * - Longer values become `ab****yz` — first two and last two characters
 *   preserved so an operator can confirm which secret loaded without
 *   exposing the bulk of it.
 *
 * Exported from `functype-os/config` for ad-hoc masking outside
 * `bootDiagnostics`.
 *
 * @example
 * ```ts
 * maskValue("short")              // "****"
 * maskValue("supersecretvalue")   // "su****ue"
 * ```
 */
export const maskValue = (value: string): string => {
  if (value.length <= 8) return "****"
  return `${value.slice(0, 2)}****${value.slice(-2)}`
}
