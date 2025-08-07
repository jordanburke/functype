import type { Either } from "@/either/Either"
import { Left, Right } from "@/either/Either"
import { ParseError } from "@/error/ParseError"

export const parseNumber = (input: string): Either<ParseError, number> => {
  const result = parseInt(input, 10)
  if (isNaN(result)) {
    return Left(ParseError(`${result}`))
  } else {
    return Right(result)
  }
}
