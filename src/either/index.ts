import { Either, Left, Right } from "./Either"

// Helper functions
export const left = <L, R>(value: L): Either<L, R> => Left<L, R>(value)
export const right = <L, R>(value: R): Either<L, R> => Right<L, R>(value)

export { Either, Left, Right }
