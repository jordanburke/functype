/**
 * Internal raw-ANSI color helpers for boot diagnostics output.
 *
 * Respects established conventions:
 * - `NO_COLOR=1` (any value) → output uncolored, regardless of TTY. See
 *   https://no-color.org/.
 * - `FORCE_COLOR=1` (any value) → output colored, regardless of TTY. Useful
 *   for CI logs that pipe stdout but want the colors preserved.
 * - Default: color when `process.stdout.isTTY`, plain otherwise.
 *
 * Zero deps. ANSI escape codes haven't changed since 1979.
 *
 * @internal — not re-exported from the package barrel.
 */

const shouldColor = (): boolean => {
  if (process.env.NO_COLOR !== undefined) return false
  if (process.env.FORCE_COLOR !== undefined) return true
  return process.stdout.isTTY
}

const wrap =
  (code: string) =>
  (s: string): string =>
    shouldColor() ? `\x1b[${code}m${s}\x1b[0m` : s

export const red = wrap("31")
export const green = wrap("32")
export const yellow = wrap("33")
export const blue = wrap("34")
export const magenta = wrap("35")
export const cyan = wrap("36")
export const gray = wrap("90")
