import { Typeable } from "../../typeable/Typeable"

/**
 * Base Object from which most other objects inherit
 * @param type
 * @constructor
 */
export function Base(type: string) {
  return {
    ...Typeable(type),
    toString() {
      return `${type}()`
    },
  }
}
