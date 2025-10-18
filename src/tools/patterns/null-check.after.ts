/**
 * @pattern null-check
 * @description Use Option instead of null/undefined checks
 * @confidence 0.9
 * @tags null, undefined, optional, ?., !==, !=, == null
 */

import { Option } from "@/option"

export function processValue(value: string | null | undefined): string {
  return Option(value)
    .map((v) => v.toUpperCase())
    .orElse("")
}

export function getUserName(user: { name?: string } | null): string | null {
  return Option(user)
    .flatMap((u) => Option(u.name))
    .orNull()
}
