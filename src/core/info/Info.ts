import { Base } from "@/core/base/Base"
import { DO_PROTOCOL } from "@/do"
import type { Identity } from "@/identity/Identity"

// Re-export to satisfy type declaration requirements
export { DO_PROTOCOL }

type Params = {
  id: string
  description: string
  location: string
  reason: string
  means: string
} & Identity<string>

/**
 * Base Object from which most other objects inherit
 * @param type
 * @param body
 * @param params
 * @constructor
 */
export function Info<T extends Record<string, unknown>>(type: string, body: T, params: Params) {
  return {
    ...Base(type, body),
    ...params,
  }
}
