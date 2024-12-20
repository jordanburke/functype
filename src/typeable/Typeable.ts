export function Typeable<T extends string>(type: T) {
  return {
    _tag: type,
  } as const // Use const assertion for readonly properties
}

// Extract the return type of the EncodedType function
export type Typeable<T extends string> = ReturnType<typeof Typeable<T>>

export type UnTag<T> = Omit<T, "_tag">

export type TypeGuard<A, B extends A> = (a: A | undefined) => a is B
