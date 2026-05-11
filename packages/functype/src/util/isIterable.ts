export const isIterable = <T>(value: unknown): value is Iterable<T> => {
  return value != null && typeof (value as Record<symbol, unknown>)[Symbol.iterator] === "function"
}
