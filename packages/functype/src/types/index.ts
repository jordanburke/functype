export type Type = unknown

/**
 * The result type of a `fold` or `match` whose branches return `U` and `V`: the wider of the two
 * when one contains the other, so `fold(() => [], (v) => [v])` stays `number[]`, else `U | V`.
 * An `any` branch gives `any`, as a one-type `fold` did.
 */
export type Unify<U, V> = 0 extends 1 & U ? U : 0 extends 1 & V ? V : [U] extends [V] ? V : [V] extends [U] ? U : U | V
