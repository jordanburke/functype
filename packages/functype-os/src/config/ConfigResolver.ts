import type { Either } from "functype"
import { IO, Left, List, Option, Right } from "functype"

import type { ConfigError } from "../errors/errors"
import { ConfigError as ConfigErrorConstructor } from "../errors/errors"
import { Fs } from "../fs/Fs"
import { expandPath } from "../path/PathExpander"

const tryExpandPath = (candidate: string): Option<string> => {
  const result = expandPath(candidate)
  return result.fold(
    () => Option<string>(undefined),
    (v) => Option(v),
  )
}

// Checks candidates in order and stops at the first that exists.
const findFirstExisting = (candidates: List<string>): IO<never, never, Option<string>> =>
  candidates.headOption.fold(
    () => IO.succeed(Option<string>(undefined)),
    (head) =>
      Fs.exists(head).flatMap((found) => (found ? IO.succeed(Option(head)) : findFirstExisting(candidates.tail))),
  )

// Expand each candidate; drop entries whose env variables didn't resolve.
const presentPaths = (candidates: readonly string[]): List<string> =>
  List<string>(candidates.flatMap((c) => tryExpandPath(c).toArray() as string[]))

export const ConfigResolver = {
  // Async methods — return a lazy IO; nothing touches the filesystem until `.run()`

  resolve: (options: { readonly candidates: readonly string[] }): IO<never, never, Option<string>> =>
    findFirstExisting(presentPaths(options.candidates)),

  resolveRequired: (options: { readonly candidates: readonly string[] }): IO<never, ConfigError, string> =>
    ConfigResolver.resolve(options).flatMap((found) =>
      found.fold<IO<never, ConfigError, string>>(
        () => IO.fail(ConfigErrorConstructor(options.candidates)),
        (path) => IO.succeed(path),
      ),
    ),

  // Checks paths one at a time, in order. They're a handful of config candidates, so this
  // costs nothing measurable and keeps the result order stable.
  resolveAll: (options: { readonly candidates: readonly string[] }): IO<never, never, List<string>> =>
    IO.forEach(presentPaths(options.candidates).toArray(), (path) =>
      Fs.exists(path).map((found) => (found ? [path] : [])),
    ).map((perPath) => List<string>(perPath.flat())),

  // Sync methods — return Either<ConfigError, T>

  resolveSync: (options: { readonly candidates: readonly string[] }): Option<string> =>
    presentPaths(options.candidates).find(Fs.existsSync),

  resolveRequiredSync: (options: { readonly candidates: readonly string[] }): Either<ConfigError, string> => {
    const result = ConfigResolver.resolveSync(options)
    return result.fold(
      () => Left(ConfigErrorConstructor(options.candidates)),
      (v) => Right(v),
    )
  },

  resolveAllSync: (options: { readonly candidates: readonly string[] }): List<string> =>
    presentPaths(options.candidates).filter(Fs.existsSync),
}
