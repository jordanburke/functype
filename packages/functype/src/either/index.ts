import { ParseError } from "@/error/ParseError"

import type { Either } from "./Either"
import { Left, Right } from "./Either"

export * from "./Either"
export { ParseError } from "@/error/ParseError"

export const parseNumber = (input: string): Either<ParseError, number> => {
  const result = parseInt(input, 10)
  if (isNaN(result)) {
    return Left(ParseError(`${result}`))
  }
  return Right(result)
}
