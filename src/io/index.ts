/**
 * IO Effect module - lazy, composable effects with typed errors.
 *
 * @example
 * ```typescript
 * import { IO, Exit } from 'functype/io'
 *
 * // Create effects
 * const program = IO.sync(() => 42)
 *   .map(x => x * 2)
 *   .flatMap(x => IO.succeed(x + 1))
 *
 * // Run effects
 * const result = await program.run()
 * const exit = await program.runExit()
 *
 * // Handle exits
 * exit.match({
 *   Success: (value) => console.log('Success:', value),
 *   Failure: (error) => console.error('Failed:', error),
 *   Interrupted: (fiberId) => console.log('Interrupted:', fiberId)
 * })
 * ```
 *
 * @module io
 * @category IO
 */

export type { ExitTag, Exit as ExitType } from "./Exit"
export { Exit } from "./Exit"
export type { IO as IOType, RIO, Task, UIO } from "./IO"
export { IO } from "./IO"
