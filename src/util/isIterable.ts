export const isIterable = <T>(value: unknown): value is Iterable<T> => {
  return value != null && typeof value[Symbol.iterator] === "function"
}
