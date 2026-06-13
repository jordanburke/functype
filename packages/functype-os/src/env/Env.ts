import type { Either } from "functype"
import { Left, List, Option, Right, Try } from "functype"

import { EnvError } from "../errors/errors"

const EnvConstructor = (name: string): Option<string> => Option(process.env[name])

const EnvCompanion = {
  get: (name: string): Option<string> => Option(process.env[name]),

  getRequired: (name: string): Either<EnvError, string> => Option(process.env[name]).toEither(EnvError(name)),

  getOrDefault: (name: string, defaultValue: string): string => process.env[name] ?? defaultValue,

  has: (name: string): boolean => process.env[name] !== undefined,

  entries: (): List<readonly [string, string]> => {
    const pairs: Readonly<Array<readonly [string, string]>> = Object.entries(process.env)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map(([k, v]) => [k, v] as const)
    return List(pairs)
  },

  parse: <T>(name: string, parser: (value: string) => T): Either<EnvError, T> => {
    const valueOpt = Option(process.env[name])
    if (valueOpt.isEmpty) return Left(EnvError(name))
    const value = valueOpt.orThrow()
    const parsed = Try(() => parser(value)).toEither((error) =>
      EnvError(name, `Failed to parse '${name}': ${error instanceof Error ? error.message : String(error)}`),
    )
    return parsed.flatMap((p) =>
      typeof p === "number" && isNaN(p)
        ? Left(EnvError(name, `Cannot parse '${value}' as number for '${name}'`))
        : Right(p),
    )
  },
}

export const Env: typeof EnvConstructor & typeof EnvCompanion = Object.assign(EnvConstructor, EnvCompanion)
