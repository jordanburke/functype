import { Typeable, TypeableParams } from "@/typeable/Typeable"

export type ValuableParams<Tag extends string, T, V> = TypeableParams<Tag, T> & { value: V }

export function Valuable<Tag extends string, V, T = object>(params: ValuableParams<Tag, T, V>) {
  const t = Typeable(params)
  return {
    toValue: () => ({ _tag: t._tag, value: params.value }),
  }
}

// Extract the return type of the EncodedType function
export type Valuable<Tag extends string, V, T = object> = ReturnType<typeof Valuable<Tag, V, T>>
