import { Base } from "@/core/base/Base"
import type { Identity } from "@/identity/Identity"

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
