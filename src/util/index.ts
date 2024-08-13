import { ParseError } from "../error/ParseError"
import { left, right } from "../either"
import { Either } from "../either"

export const parseNumber = (input: string): Either<ParseError, number> => {
  const result = parseInt(input, 10)
  if (isNaN(result)) {
    return left(new ParseError(`${result}`))
  } else {
    return right(result)
  }
}
