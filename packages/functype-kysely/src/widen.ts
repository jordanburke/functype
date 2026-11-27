import type { IOType } from "functype"

/**
 * Widens an IO to services `R` and errors `E`, which must contain its own.
 *
 * IO's type parameters are invariant, so an IO that needs fewer services or fails in fewer ways
 * doesn't widen on its own. Widening is sound: such an IO fits anywhere the wider one does. The
 * bounds keep everything else checked: an error or service outside the target, or a value that
 * isn't an IO, is a compile error.
 *
 * Curried so the target is written and the IO's own types are inferred:
 * `widen<R, E | DbError>()(step)`.
 */
export const widen =
  <R, E>() =>
  <R0 extends R, E0 extends E, A>(io: IOType<R0, E0, A>): IOType<R, E, A> =>
    io as unknown as IOType<R, E, A>
