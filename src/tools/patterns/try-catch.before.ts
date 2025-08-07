/**
 * @pattern try-catch
 * @description Use Try or Either for error handling
 * @confidence 0.9
 * @tags try, catch, error, exception, throw
 */

export function parseJSON(str: string): object | null {
  try {
    return JSON.parse(str)
  } catch (_e) {
    return null
  }
}

export function divideNumbers(a: number, b: number): number | string {
  try {
    if (b === 0) throw new Error("Division by zero")
    return a / b
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : "Unknown error"}`
  }
}
