/**
 * @pattern try-catch
 * @description Use Try or Either for error handling
 * @confidence 0.9
 * @tags try, catch, error, exception, throw
 */

import { Try } from "@/try"

export function parseJSON(str: string): object | null {
  return Try(() => JSON.parse(str)).fold(
    (_) => null,
    (result) => result,
  )
}

export function divideNumbers(a: number, b: number): number | string {
  return Try(() => {
    if (b === 0) throw new Error("Division by zero")
    return a / b
  }).fold<number | string>(
    (error) => `Error: ${error.message}`,
    (result) => result,
  )
}
