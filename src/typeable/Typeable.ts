export function Typeable<T extends string>(type: T) {
  return {
    _tag: type,
  } as const // Use const assertion for readonly properties
}

// Extract the return type of the EncodedType function
export type Typeable<T extends string> = ReturnType<typeof Typeable<T>>
