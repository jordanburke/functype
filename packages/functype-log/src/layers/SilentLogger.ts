import { IO } from "functype"

import type { Logger, LogMetadata } from "../logger/Logger"

const noop = (_message: string, _metadata?: LogMetadata): IO<never, never, void> => IO.succeed(undefined as void)

export const silentLogger: Logger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  withError: () => silentLogger,
  withContext: () => silentLogger,
  child: () => silentLogger,
}
