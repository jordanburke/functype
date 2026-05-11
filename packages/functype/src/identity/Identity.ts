import { Companion } from "@/companion/Companion"

/**
 * Identity — a trivial container carrying a single tagged value.
 * Covariant in T (`<out T>`). `isSame` takes `Identity<unknown>` so that
 * cross-type equality checks (semantically always `false` for unrelated types)
 * don't block variance — mirroring the `contains(unknown)` pattern used on
 * List/Set/Map.
 */
export type Identity<out T> = {
  readonly id: T
  isSame?: (other: Identity<unknown>) => boolean
}

const IdentityConstructor = <T>(value: T): Identity<T> => {
  const isSame = (other: Identity<unknown>): boolean => {
    return other.id === value
  }
  return {
    id: value,
    isSame,
  }
}

const IdentityCompanion = {
  /**
   * Creates an Identity. Alias for Identity constructor.
   * @param value - The value to wrap
   * @returns Identity instance
   */
  of: <T>(value: T) => IdentityConstructor(value),

  /**
   * Creates an Identity. Same as of.
   * @param value - The value to wrap
   * @returns Identity instance
   */
  pure: <T>(value: T) => IdentityConstructor(value),
}

export const Identity = Companion(IdentityConstructor, IdentityCompanion)
