/**
 * IO Effect module - lazy, composable effects with typed errors.
 *
 * @example
 * ```typescript
 * import { IO, Exit, Tag, Context, Layer } from 'functype/io'
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
 * // Dependency injection
 * interface Logger {
 *   log(message: string): void
 * }
 * const Logger = Tag<Logger>("Logger")
 *
 * const logProgram = IO.service(Logger).flatMap(logger =>
 *   IO.sync(() => logger.log("Hello!"))
 * )
 *
 * // Provide services
 * logProgram.provideService(Logger, { log: console.log }).run()
 * ```
 *
 * @module io
 * @category IO
 */

export type { ContextServices, Context as ContextType, HasService } from "./Context"
export { Context } from "./Context"
export type { ExitTag, Exit as ExitType } from "./Exit"
export { Exit } from "./Exit"
export type { IO as IOType, RIO, Task, UIO } from "./IO"
export { IO } from "./IO"
export type { LayerError, LayerInput, LayerOutput, Layer as LayerType } from "./Layer"
export { Layer } from "./Layer"
export type { TagService, Tag as TagType } from "./Tag"
export { Tag } from "./Tag"
