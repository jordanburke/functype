export function Valuable<T>(value: T) {
  return {
    value,
  }
}

// Extract the return type of the EncodedType function
export type Valuable<T extends string> = ReturnType<typeof Valuable<T>>
