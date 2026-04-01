import { IO } from "functype"
import type { ILogLayer } from "loglayer"

import type { Logger, LogLevel, LogMetadata } from "../logger/Logger"

const makeMethod =
  (logLayer: ILogLayer, level: LogLevel, baseError?: Error) =>
  (message: string, metadata?: LogMetadata): IO<never, never, void> =>
    IO.sync(() => {
      let entry = metadata ? logLayer.withMetadata(metadata) : logLayer
      if (baseError) {
        entry = entry.withError(baseError)
      }
      entry[level](message)
    })

export const logLayerAdapter = (logLayer: ILogLayer, baseError?: Error): Logger => ({
  trace: makeMethod(logLayer, "trace", baseError),
  debug: makeMethod(logLayer, "debug", baseError),
  info: makeMethod(logLayer, "info", baseError),
  warn: makeMethod(logLayer, "warn", baseError),
  error: makeMethod(logLayer, "error", baseError),
  fatal: makeMethod(logLayer, "fatal", baseError),
  withError: (err: Error) => logLayerAdapter(logLayer, err),
  withContext: (ctx: LogMetadata) => logLayerAdapter(logLayer.withContext(ctx), baseError),
  child: (ctx?: LogMetadata) => {
    const childLog = logLayer.child()
    return ctx ? logLayerAdapter(childLog.withContext(ctx)) : logLayerAdapter(childLog)
  },
})
