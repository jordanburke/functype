import { Typeable } from "@/typeable/Typeable"

/**
 * Base Object from which most other objects inherit
 * @param type - The type name for the object
 * @param body - The implementation body
 */
export function Base<T>(type: string, body: T) {
  return {
    ...Typeable({ _tag: type, impl: body }),
    toString() {
      return `${type}()`
    },
  }
}
