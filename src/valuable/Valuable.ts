import { Typeable } from "@/typeable/Typeable"

export function Valuable<Tag extends string, V, T = object>(tag: Tag, data: T, value: V) {
  const t = Typeable(tag, data)
  return {
    toValue: () => ({ _tag: t._tag, value }),
  }
}

// Extract the return type of the EncodedType function
export type Valuable<Tag extends string, V, T = object> = ReturnType<typeof Valuable<Tag, V, T>>
