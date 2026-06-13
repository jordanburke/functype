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

const findFirstExistingAsync = async (candidates: readonly string[], startIndex: number): Promise<Option<string>> => {
  if (startIndex >= candidates.length) return Option<string>(undefined)
  const candidate = candidates[startIndex] as string
  const expanded = tryExpandPath(candidate)
  if (expanded.isNone()) return findFirstExistingAsync(candidates, startIndex + 1)
  const existsResult = await Fs.exists(expanded.orThrow())
  if (existsResult.isOk() && existsResult.value) return expanded
  return findFirstExistingAsync(candidates, startIndex + 1)
}

// Expand each candidate; drop entries whose env variables didn't resolve.
const presentPaths = (candidates: readonly string[]): List<string> =>
  List<string>(candidates.flatMap((c) => tryExpandPath(c).toArray() as string[]))

export const ConfigResolver = {
  // Async methods — return TaskResult<T>

  resolve: async (options: { readonly candidates: readonly string[] }): TaskResult<Option<string>> => {
    const found = await findFirstExistingAsync(options.candidates, 0)
    return Ok(found)
  },

  resolveRequired: async (options: { readonly candidates: readonly string[] }): TaskResult<string> => {
    const result = await ConfigResolver.resolve(options)
    if (result.isErr()) return Err(result.error)

    return result.orThrow().fold<TaskResult<string>>(
      () => Promise.resolve(Err(ConfigErrorConstructor(options.candidates))),
      (v) => Promise.resolve(Ok(v)),
    )
  },

  resolveAll: async (options: { readonly candidates: readonly string[] }): TaskResult<List<string>> => {
    const expanded = presentPaths(options.candidates).toArray()
    const checks = await Promise.all(
      expanded.map(async (p): Promise<string | null> => {
        const r = await Fs.exists(p)
        return r.isOk() && r.value ? p : null
      }),
    )
    const found = checks.filter((p): p is string => p !== null)
    return Ok(List<string>(found))
  },

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
