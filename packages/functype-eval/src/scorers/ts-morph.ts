/**
 * ts-morph pass over the target sources. Produces:
 *  - `nonNull`: count of `!` non-null assertion expressions (escape hatches — a penalty dimension)
 *  - `loc`:     total non-blank lines of code, used as the density denominator for every dimension
 *
 * Purely syntactic — no tsconfig or type information required; files are added by glob.
 */

import { join } from "node:path"

import { Project, SyntaxKind } from "ts-morph"

import { IGNORE_GLOBS } from "./eslint"

export type TsMorphResult = {
  readonly nonNull: number
  readonly loc: number
  readonly fileCount: number
}

const sourceGlobs = (target: string): ReadonlyArray<string> => [
  join(target, "**/*.ts"),
  join(target, "**/*.tsx"),
  ...IGNORE_GLOBS.map((glob) => `!${glob}`),
]

const nonBlankLines = (text: string): number => text.split(/\r?\n/).filter((line) => line.trim() !== "").length

export const scoreTsMorph = (target: string): TsMorphResult => {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    skipLoadingLibFiles: true,
    compilerOptions: { allowJs: false },
  })

  const files = project.addSourceFilesAtPaths(sourceGlobs(target))

  const nonNull = files.reduce(
    (total, file) => total + file.getDescendantsOfKind(SyntaxKind.NonNullExpression).length,
    0,
  )
  const loc = files.reduce((total, file) => total + nonBlankLines(file.getFullText()), 0)

  return { nonNull, loc, fileCount: files.length }
}
