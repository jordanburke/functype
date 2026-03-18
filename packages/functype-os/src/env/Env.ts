import type { Either } from "functype"
import { Left, List, Option, Right } from "functype"

import { EnvError } from "../errors/errors"

const EnvConstructor = (name: string): Option<string> => Option(process.env[name])

const EnvCompanion = {
  get: (name: string): Option<string> => Option(process.env[name]),

  getRequired: (name: string): Either<EnvError, string> => {
    const value = process.env[name]
    return value !== undefined ? Right(value) : Left(EnvError(name))
  },

  getOrDefault: (name: string, defaultValue: string): string => process.env[name] ?? defaultValue,

  has: (name: string): boolean => process.env[name] !== undefined,

  entries: (): List<readonly [string, string]> => {
    const pairs: Readonly<Array<readonly [string, string]>> = Object.entries(process.env)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([k, v]) => [k, v] as const)
    return List(pairs)
  },

  parse: <T>(name: string, parser: (value: string) => T): Either<EnvError, T> => {
    const value = process.env[name]
    if (value === undefined) {
      return Left(EnvError(name))
    }
    try {
      const parsed = parser(value)
      if (typeof parsed === "number" && isNaN(parsed)) {
        return Left(EnvError(name, `Cannot parse '${value}' as number for '${name}'`))
      }
      return Right(parsed)
    } catch (error) {
      return Left(EnvError(name, `Failed to parse '${name}': ${error instanceof Error ? error.message : String(error)}`))
    }
  },
}

export const Env: typeof EnvConstructor & typeof EnvCompanion = Object.assign(EnvConstructor, EnvCompanion)
