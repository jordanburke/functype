import { Either, Left, Right } from "./Either"

// Helper functions
export const left = <L, R>(value: L): Either<L, R> => new Left<L, R>(value)
export const right = <L, R>(value: R): Either<L, R> => new Right<L, R>(value)

export { Left, Right, Either }
