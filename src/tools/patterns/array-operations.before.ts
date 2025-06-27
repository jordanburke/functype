/**
 * @pattern array-map-filter
 * @description Use List for immutable array operations
 * @confidence 0.75
 * @tags array, map, filter, reduce, .map(, .filter(, .forEach(
 */

export function processNumbers(numbers: number[]): number[] {
  return numbers.filter((x) => x > 0).map((x) => x * 2)
}

export function sumPositive(values: number[]): number {
  return values.filter((v) => v > 0).reduce((sum, v) => sum + v, 0)
}

export function transformUsers(users: Array<{ name: string; age: number }>): string[] {
  return users
    .filter((user) => user.age >= 18)
    .map((user) => user.name.toUpperCase())
    .sort()
}
