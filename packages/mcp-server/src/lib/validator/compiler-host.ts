/**
 * Custom TypeScript CompilerHost for in-memory type-checking of functype code.
 * Resolves functype .d.ts files from node_modules for accurate type validation.
 */

import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"

import ts from "typescript"

const require = createRequire(import.meta.url)

const resolveFunctypeDistDir = (): string => {
  // Resolve the main entry point, then walk up to find the dist dir
  const functypeMain = require.resolve("functype")
  // functypeMain is something like .../node_modules/functype/dist/index.js
  // Walk up until we find a directory containing package.json
  let dir = dirname(functypeMain)
  for (let i = 0; i < 5; i++) {
    try {
      readFileSync(join(dir, "package.json"), "utf-8")
      return join(dir, "dist")
    } catch {
      dir = dirname(dir)
    }
  }
  // Fallback: assume dist is sibling to main
  return dirname(functypeMain)
}

const fileCache = new Map<string, string | undefined>()

export const clearFileCache = (): void => {
  fileCache.clear()
}

const readFileCached = (path: string): string | undefined => {
  if (fileCache.has(path)) return fileCache.get(path)
  try {
    const content = readFileSync(path, "utf-8")
    fileCache.set(path, content)
    return content
  } catch {
    fileCache.set(path, undefined)
    return undefined
  }
}

export const VIRTUAL_FILENAME = "/__functype_validate__.ts"

export const compilerOptions: ts.CompilerOptions = {
  strict: true,
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  noEmit: true,
  noUncheckedIndexedAccess: true,
  skipLibCheck: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  declaration: false,
  sourceMap: false,
}

export const createCompilerHost = (sourceCode: string): ts.CompilerHost => {
  const functypeDistDir = resolveFunctypeDistDir()
  const defaultHost = ts.createCompilerHost(compilerOptions)

  const host: ts.CompilerHost = {
    ...defaultHost,

    getSourceFile(fileName, languageVersion) {
      if (fileName === VIRTUAL_FILENAME) {
        return ts.createSourceFile(fileName, sourceCode, languageVersion, true)
      }
      return defaultHost.getSourceFile(fileName, languageVersion)
    },

    fileExists(fileName) {
      if (fileName === VIRTUAL_FILENAME) return true
      return defaultHost.fileExists(fileName)
    },

    readFile(fileName) {
      if (fileName === VIRTUAL_FILENAME) return sourceCode
      return readFileCached(fileName) ?? defaultHost.readFile(fileName)
    },

    resolveModuleNames(moduleNames, containingFile) {
      return moduleNames.map((moduleName): ts.ResolvedModule | undefined => {
        if (moduleName === "functype" || moduleName.startsWith("functype/")) {
          const subpath = moduleName === "functype" ? "index.d.ts" : moduleName.replace("functype/", "") + ".d.ts"
          const resolvedFileName = resolve(functypeDistDir, subpath)
          if (readFileCached(resolvedFileName) !== undefined) {
            return { resolvedFileName, isExternalLibraryImport: true }
          }
          // Try with /index.d.ts for subpath modules
          const indexPath = resolve(functypeDistDir, subpath.replace(".d.ts", "/index.d.ts"))
          if (readFileCached(indexPath) !== undefined) {
            return { resolvedFileName: indexPath, isExternalLibraryImport: true }
          }
          return undefined
        }

        const result = ts.resolveModuleName(moduleName, containingFile, compilerOptions, defaultHost)
        return result.resolvedModule
      })
    },
  }

  return host
}
