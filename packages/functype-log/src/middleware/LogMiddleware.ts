import type { IO } from "functype"
import { IO as IOImpl } from "functype"

import type { Logger, LogLevel } from "../logger/Logger"
import { Logger as LoggerTag } from "../logger/Logger"

/** Wrap any IO with start/complete/error logging at debug level */
export const withLogging = <R, E, A>(name: string, effect: IO<R, E, A>): IO<R | Logger, E, A> =>
  IOImpl.gen(function* () {
    const log = yield* IOImpl.service(LoggerTag)
    yield* log.debug(`${name}: starting`)
    const result = yield* effect
    yield* log.debug(`${name}: completed`)
    return result
  }) as IO<R | Logger, E, A>

/** Create a tap function that logs at the specified level */
export const tapLog =
  <A>(level: LogLevel, message: string | ((a: A) => string)) =>
  <R, E>(effect: IO<R, E, A>): IO<R | Logger, E, A> =>
    IOImpl.gen(function* () {
      const result = yield* effect
      const log = yield* IOImpl.service(LoggerTag)
      const msg = typeof message === "string" ? message : message(result)
      yield* log[level](msg)
      return result
    }) as IO<R | Logger, E, A>
