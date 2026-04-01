import type { IO } from "functype"
import { IO as IOImpl } from "functype"

import type { Logger, LogLevel } from "../logger/Logger"
import { Logger as LoggerTag } from "../logger/Logger"

/** Wrap any IO with start/complete/error logging at debug level */
export const withLogging = <R, E, A>(name: string, effect: IO<R, E, A>): IO<R | Logger, E, A> =>
  IOImpl.service(LoggerTag)
    .flatMap((log) => log.debug(`${name}: starting`))
    .flatMap(() => effect)
    .tapEffect(() => IOImpl.service(LoggerTag).flatMap((log) => log.debug(`${name}: completed`))) as unknown as IO<
    R | Logger,
    E,
    A
  >

/** Create a tap function that logs at the specified level */
export const tapLog =
  <A>(level: LogLevel, message: string | ((a: A) => string)) =>
  <R, E>(effect: IO<R, E, A>): IO<R | Logger, E, A> =>
    effect.tapEffect((result) =>
      IOImpl.service(LoggerTag).flatMap((log) => {
        const msg = typeof message === "string" ? message : message(result)
        return log[level](msg)
      }),
    ) as unknown as IO<R | Logger, E, A>
