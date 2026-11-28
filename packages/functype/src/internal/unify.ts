/**
 * Types a `fold` or `match` result as its declared {@link Unify} return type, which TypeScript
 * infers from the method's signature. The value is one branch's result, and a branch's result is
 * always a `Unify` of the branches' types, but TypeScript can't prove that for generic branches.
 */
export const unify = <R>(value: unknown): R => value as R
