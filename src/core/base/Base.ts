import { Typeable } from "../../typeable/Typeable"

/**
 * Base Object from which most other objects inherit
 * @param type
 * @param body
 * @constructor
 */
export function Base<T>(type: string, body: T) {
  return {
    ...Typeable(type, body),
    toString() {
      return `${type}()`
    },
  }
}
