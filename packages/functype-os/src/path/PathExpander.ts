import * as os from "node:os"
import * as nodePath from "node:path"

import type { Either } from "functype"
import { Left, Right } from "functype"

import { PathError } from "../errors/errors"

export const expandTilde = (p: string): string => {
  if (p === "~") return os.homedir()
  if (p.startsWith("~/") || p.startsWith("~\\")) return nodePath.join(os.homedir(), p.slice(2))
  return p
}

export const expandVars = (p: string): Either<PathError, string> => {
  const unresolvedVars: string[] = []
  const result = p.replace(
    /\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (_match, braced: string | undefined, bare: string | undefined) => {
      const varName = braced ?? bare ?? ""
      const value = process.env[varName]
      if (value === undefined) {
        unresolvedVars.push(varName)
        return _match
      }
      return value
    },
  )

  if (unresolvedVars.length > 0) {
    return Left(PathError(p, "unresolved_variable", `Unresolved variables: ${unresolvedVars.join(", ")}`))
  }

  return Right(result)
}

export const expandPath = (p: string): Either<PathError, string> => {
  const tildeExpanded = expandTilde(p)
  const varsResult = expandVars(tildeExpanded)
  if (varsResult.isLeft()) return varsResult
  return Right(nodePath.resolve(varsResult.orThrow()))
}

export const Path = {
  expand: expandPath,
  expandTilde,
  expandVars,
  join: (...segments: string[]): string => nodePath.join(...segments),
  resolve: (...segments: string[]): string => nodePath.resolve(...segments),
  dirname: (p: string): string => nodePath.dirname(p),
  basename: (p: string, suffix?: string): string => nodePath.basename(p, suffix),
  extname: (p: string): string => nodePath.extname(p),
  isAbsolute: (p: string): boolean => nodePath.isAbsolute(p),
}
