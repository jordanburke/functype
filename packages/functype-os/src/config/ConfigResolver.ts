import type { TaskResult } from "functype"
import { Err, List, Ok, Option } from "functype"

import { ConfigError } from "../errors/errors"
import { Fs } from "../fs/Fs"
import { expandPath } from "../path/PathExpander"

const tryExpandPath = (candidate: string): string | undefined => {
  const result = expandPath(candidate)
  if (result.isLeft()) return undefined
  return result.orThrow()
}

export const ConfigResolver = {
  resolve: async (options: { candidates: readonly string[] }): TaskResult<Option<string>> => {
    for (const candidate of options.candidates) {
      const expanded = tryExpandPath(candidate)
      if (expanded === undefined) continue

      const existsResult = await Fs.exists(expanded)
      if (existsResult.isErr()) continue
      if (existsResult.value) {
        return Ok(Option(expanded))
      }
    }
    return Ok(Option<string>(undefined))
  },

  resolveRequired: async (options: { candidates: readonly string[] }): TaskResult<string> => {
    const result = await ConfigResolver.resolve(options)
    if (result.isErr()) return Err(result.error)

    const optValue = result.orThrow()
    if (optValue.isSome()) {
      return Ok(optValue.orThrow())
    }

    return Err(ConfigError(options.candidates))
  },

  resolveAll: async (options: { candidates: readonly string[] }): TaskResult<List<string>> => {
    const found: string[] = []

    for (const candidate of options.candidates) {
      const expanded = tryExpandPath(candidate)
      if (expanded === undefined) continue

      const existsResult = await Fs.exists(expanded)
      if (existsResult.isErr()) continue
      if (existsResult.value) {
        found.push(expanded)
      }
    }

    return Ok(List(found))
  },
}
