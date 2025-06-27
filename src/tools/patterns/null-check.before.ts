/**
 * @pattern null-check
 * @description Use Option instead of null/undefined checks
 * @confidence 0.9
 * @tags null, undefined, optional, ?., !==, !=, == null
 */

export function processValue(value: string | null | undefined): string {
  if (value !== null && value !== undefined) {
    return value.toUpperCase()
  }
  return ""
}

export function getUserName(user: { name?: string } | null): string | null {
  if (user == null) {
    return null
  }
  if (user.name == null) {
    return null
  }
  return user.name
}
