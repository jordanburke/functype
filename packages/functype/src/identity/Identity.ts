import { Companion } from "@/companion/Companion"
import { type A, define, type Mutable } from "@/internal/define"

/**
 * Identity — a trivial container carrying a single tagged value.
 * Covariant in T (`<out T>`). `isSame` takes `Identity<unknown>` so that
 * cross-type equality checks (semantically always `false` for unrelated types)
 * don't block variance — mirroring the `contains(unknown)` pattern used on
 * List/Set/Map.
 */
export type Identity<out T> = {
  readonly _tag: "Identity"
  readonly id: T
  /** True when `other` holds the same value, compared with `===`. */
  isSame(other: Identity<unknown>): boolean
}

/** Every Identity shares this method (#276 §14); a value keeps only `_tag` and `id`. */
const IdentityProto = define<Identity<A>, "_tag" | "id">()("Identity", {
  isSame(other) {
    return other.id === this.id
  },
})

const IdentityConstructor = <T>(value: T): Identity<T> => {
  // The one cast: a prototype checked at the opaque A works for every T.
  const identity = Object.create(IdentityProto) as Mutable<Identity<T>>
  // eslint-disable-next-line functional/immutable-data -- filling in the value just created
  identity._tag = "Identity"
  // eslint-disable-next-line functional/immutable-data -- filling in the value just created
  identity.id = value
  return identity
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
