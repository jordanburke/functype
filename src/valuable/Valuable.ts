import { Typeable } from "@/typeable/Typeable"

/**
 * Parameters for creating a Valuable instance
 */
export type ValuableParams<Tag extends string, T, V> = { _tag: Tag; impl: T; value: V }

/**
 * Creates a Valuable wrapper that adds value extraction capabilities
 * @param params - Configuration parameters
 */
export function Valuable<Tag extends string, V, T = object>(params: ValuableParams<Tag, T, V>) {
  const t = Typeable<Tag, T>({ _tag: params._tag, impl: params.impl })
  return {
    ...t,
    toValue: () => ({ _tag: t._tag, value: params.value }),
  }
}

// Extract the return type of the Valuable function
export type Valuable<Tag extends string, V, T = object> = ReturnType<typeof Valuable<Tag, V, T>>
