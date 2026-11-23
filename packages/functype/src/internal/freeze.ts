/**
 * Whether collections freeze each value they build. Production is the default: a value is not frozen,
 * because the types mark its fields read-only, eslint-plugin-functype's `no-container-mutation` reports a
 * write through a cast, and freezing was most of what building a collection cost.
 *
 * Development freezes, so a write from untyped code (a value passed to an `any` parameter, plain
 * JavaScript) throws a `TypeError` where someone will see it:
 *
 * - `NODE_ENV=development` turns it on.
 * - `FUNCTYPE_FREEZE=1` (or `true`) turns it on anywhere, a test suite included, and `FUNCTYPE_FREEZE=0`
 *   (or `false`) turns it off. It wins over `NODE_ENV`.
 * - Test runs don't freeze unless asked to: Vitest sets `NODE_ENV=test`, and `vi.spyOn` on a frozen value
 *   throws.
 *
 * Read once, when functype loads. Without a `process` (a browser, a Worker) it is production.
 */

type ProcessLike = { readonly process?: { readonly env?: Readonly<Record<string, string | undefined>> } }

const env = (name: string): string | undefined => {
  try {
    return (globalThis as ProcessLike).process?.env?.[name]
  } catch {
    // Deno without --allow-env throws on reading the environment.
    return undefined
  }
}

const decide = (): boolean => {
  const explicit = env("FUNCTYPE_FREEZE")?.trim().toLowerCase()
  if (explicit === "1" || explicit === "true") return true
  if (explicit === "0" || explicit === "false") return false
  return env("NODE_ENV") === "development"
}

/** True when collections freeze each value: under `NODE_ENV=development` or `FUNCTYPE_FREEZE=1`. */
export const FREEZE_VALUES: boolean = decide()

/** Freezes `value` in development, and returns it unchanged in production. */
export const freezeInDevelopment = <T extends object>(value: T): T => (FREEZE_VALUES ? Object.freeze(value) : value)
