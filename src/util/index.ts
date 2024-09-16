import { left, right } from "../either"
import { Either } from "../either"
import { ParseError } from "../error/ParseError"

export const parseNumber = (input: string): Either<ParseError, number> => {
  const result = parseInt(input, 10)
  if (isNaN(result)) {
    return left(ParseError(`${result}`))
  } else {
    return right(result)
  }
}
