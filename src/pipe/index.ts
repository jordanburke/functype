import type { Type } from "@/types"

/**
 * Pipe interface for functional data structures
 * @typeParam T - The type of value to pipe
 */
export type Pipe<T extends Type> = {
  /**
   * Pipes the value through the provided function
   * @param f - The function to apply to the value
   * @returns The result of applying the function to the value
   * @typeParam U - The return type of the function
   */
  pipe<U extends Type>(f: (value: T) => U): U
}
