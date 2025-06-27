/**
 * @pattern array-map-filter
 * @description Use List for immutable array operations
 * @confidence 0.75
 * @tags array, map, filter, reduce, .map(, .filter(, .forEach(
 */

import { List } from "@/list"

export function processNumbers(numbers: number[]): number[] {
  return List(numbers)
    .filter((x) => x > 0)
    .map((x) => x * 2)
    .toArray()
}

export function sumPositive(values: number[]): number {
  return List(values)
    .filter((v) => v > 0)
    .foldLeft(0)((sum, v) => sum + v)
}

export function transformUsers(users: Array<{ name: string; age: number }>): string[] {
  return List(users)
    .filter((user) => user.age >= 18)
    .map((user) => user.name.toUpperCase())
    .toArray()
    .sort()
}
