import { Companion } from "@/companion/Companion"

export type Identity<T> = {
  id: T
  isSame?: (other: Identity<T>) => boolean
}

const IdentityConstructor = <T>(value: T): Identity<T> => {
  const isSame = (other: Identity<T>): boolean => {
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
