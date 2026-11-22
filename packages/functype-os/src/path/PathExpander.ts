import * as os from "node:os"
import * as nodePath from "node:path"

import type { Either } from "functype"
import { Left, Option, Right } from "functype"

import { PathError } from "../errors/errors"

export const expandTilde = (p: string): string => {
  if (p === "~") return os.homedir()
  if (p.startsWith("~/") || p.startsWith("~\\")) return nodePath.join(os.homedir(), p.slice(2))
  return p
}

// Factor out the leading `$` and forbid `$` inside `${...}` so the engine
// can't backtrack catastrophically on inputs like `${{${{${{...` (CodeQL
// js/polynomial-redos).
const VAR_PATTERN = /\$(?:\{([^}$]+)\}|([A-Za-z_][A-Za-z0-9_]*))/g

/** `NAME` from `${NAME}` (first capture) or `$NAME` (second). */
const varNameOf = (braced: string | undefined, bare: string | undefined): string =>
  Option(braced)
    .orElse(() => Option(bare))
    .getOrElse(() => "")

export const expandVars = (p: string): Either<PathError, string> => {
  const unresolvedVars = Array.from(p.matchAll(VAR_PATTERN), (match) => varNameOf(match[1], match[2])).filter(
    (varName) => process.env[varName] === undefined,
  )

  if (unresolvedVars.length > 0) {
    return Left(PathError(p, "unresolved_variable", `Unresolved variables: ${unresolvedVars.join(", ")}`))
  }

  return Right(
    p.replace(
      VAR_PATTERN,
      (match: string, braced: string | undefined, bare: string | undefined) =>
        process.env[varNameOf(braced, bare)] ?? match,
    ),
  )
}

export const expandPath = (p: string): Either<PathError, string> =>
  expandVars(expandTilde(p)).map((expanded) => nodePath.resolve(expanded))

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
