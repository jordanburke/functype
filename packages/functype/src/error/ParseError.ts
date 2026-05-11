export const ParseError = (message?: string): Error & { name: "ParseError" } => {
  const error = new Error(message)
  error.name = "ParseError"
  return error as Error & { name: "ParseError" }
}

export type ParseError = Error & { name: "ParseError" }
