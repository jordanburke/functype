import type { Either, TaskResult } from "functype"
import { Err, Left, List, Ok, Option, Right } from "functype"

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

export const ConfigResolver = {
  // Async methods — return TaskResult<T>

  resolve: async (options: { readonly candidates: readonly string[] }): TaskResult<Option<string>> => {
    for (const candidate of options.candidates) {
      const expanded = tryExpandPath(candidate)
      if (expanded.isNone()) continue

      const existsResult = await Fs.exists(expanded.orThrow())
      if (existsResult.isErr()) continue
      if (existsResult.value) {
        return Ok(expanded)
      }
    }
    return Ok(Option<string>(undefined))
  },

  resolveRequired: async (options: { readonly candidates: readonly string[] }): TaskResult<string> => {
    const result = await ConfigResolver.resolve(options)
    if (result.isErr()) return Err(result.error)

    const optValue = result.orThrow()
    if (optValue.isSome()) {
      return Ok(optValue.orThrow())
    }

    return Err(ConfigErrorConstructor(options.candidates))
  },

  resolveAll: async (options: { readonly candidates: readonly string[] }): TaskResult<List<string>> => {
    const found: readonly string[] = options.candidates.reduce<readonly string[]>((acc, candidate) => {
      const expanded = tryExpandPath(candidate)
      if (expanded.isNone()) return acc
      return [...acc, expanded.orThrow()]
    }, [])

    const results: string[] = []
    for (const expanded of found) {
      const existsResult = await Fs.exists(expanded)
      if (existsResult.isOk() && existsResult.value) {
        results.push(expanded)
      }
    }

    return Ok(List(results))
  },

  // Sync methods — return Either<ConfigError, T>

  resolveSync: (options: { readonly candidates: readonly string[] }): Option<string> => {
    for (const candidate of options.candidates) {
      const expanded = tryExpandPath(candidate)
      if (expanded.isNone()) continue
      if (Fs.existsSync(expanded.orThrow())) {
        return expanded
      }
    }
    return Option<string>(undefined)
  },

  resolveRequiredSync: (options: { readonly candidates: readonly string[] }): Either<ConfigError, string> => {
    const result = ConfigResolver.resolveSync(options)
    return result.fold(
      () => Left(ConfigErrorConstructor(options.candidates)),
      (v) => Right(v),
    )
  },

  resolveAllSync: (options: { readonly candidates: readonly string[] }): List<string> => {
    return List(
      options.candidates.reduce<readonly string[]>((acc, candidate) => {
        const expanded = tryExpandPath(candidate)
        if (expanded.isNone()) return acc
        const path = expanded.orThrow()
        return Fs.existsSync(path) ? [...acc, path] : acc
      }, []),
    )
  },
}
