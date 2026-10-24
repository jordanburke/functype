import { existsSync, readdirSync, readFileSync } from "node:fs"
import { posix } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

/**
 * Guards the docs site's links to the API reference and to the source.
 *
 * Every page linked to `/api-docs/modules/<name>.html`, a folder TypeDoc never writes, so each
 * "API Documentation" button was a 404, and "View Source" pointed at `src/…` from before the monorepo
 * move. TypeDoc files an export under a folder named for its declaration kind (`interfaces/`,
 * `types/`, `variables/`, `functions/`), so a link is checked against the real export: the name must
 * be exported from `src/index.ts`, and the folder must match one of its declarations.
 *
 * It is a name-and-kind check, not proof the page exists. TypeDoc writes a symbol exported under two
 * names (`IO`, and `type { IO as IOType }`) once, under the first name it meets, so a module index lists
 * the value export first (checked below) and an alias like `IOType` gets no pages of its own.
 */

const { join } = posix
const PACKAGE_ROOT = join(import.meta.dirname.split("\\").join("/"), "..", "..")
const REPO_ROOT = join(PACKAGE_ROOT, "..", "..")
const SITE_DIRS = ["site/src/pages", "site/src/content", "site/src/components", "site/src/layouts"] as const

const siteFiles = (): ReadonlyArray<string> =>
  SITE_DIRS.flatMap((dir) =>
    readdirSync(join(REPO_ROOT, dir), { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(astro|md|tsx)$/.test(file))
      .map((file) => join(dir, file)),
  )

type Link = { readonly file: string; readonly url: string }

const linksMatching = (pattern: RegExp): ReadonlyArray<Link> =>
  siteFiles().flatMap((file) =>
    [...readFileSync(join(REPO_ROOT, file), "utf8").matchAll(pattern)].map((m) => ({ file, url: m[0] })),
  )

/** The TypeDoc folders each export can appear under, from its declaration kinds. */
const typedocFolders = (): ReadonlyMap<string, ReadonlySet<string>> => {
  const program = ts.createProgram([join(PACKAGE_ROOT, "src", "index.ts")], {
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    noEmit: true,
    skipLibCheck: true,
    paths: { "@/*": [join(PACKAGE_ROOT, "src", "*")] },
  })
  const checker = program.getTypeChecker()
  const index = program.getSourceFile(join(PACKAGE_ROOT, "src", "index.ts"))
  const moduleSymbol = index === undefined ? undefined : checker.getSymbolAtLocation(index)
  if (moduleSymbol === undefined) throw new Error("could not resolve src/index.ts")
  const folderOf = (declaration: ts.Declaration): string | undefined =>
    ts.isInterfaceDeclaration(declaration)
      ? "interfaces"
      : ts.isTypeAliasDeclaration(declaration)
        ? "types"
        : ts.isFunctionDeclaration(declaration)
          ? "functions"
          : ts.isVariableDeclaration(declaration)
            ? "variables"
            : ts.isClassDeclaration(declaration)
              ? "classes"
              : undefined
  const exports = checker.getExportsOfModule(moduleSymbol)
  const exportedNames = new globalThis.Set(exports.map((e) => e.name))
  return new globalThis.Map(
    exports.map((exported) => {
      const target = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
      // `export type { X as Y }` re-exports only the type side, so Y has no variables/ or functions/ page
      const typeOnly = (exported.declarations ?? []).some(
        (d) => ts.isExportSpecifier(d) && (d.isTypeOnly || d.parent.parent.isTypeOnly),
      )
      // A type-only alias of a symbol that is also exported under its own name has no pages
      const shadowAlias = typeOnly && exported.name !== target.name && exportedNames.has(target.name)
      const folders = (target.declarations ?? []).flatMap((d) => {
        const folder = folderOf(d)
        return folder === undefined || shadowAlias || (typeOnly && folder !== "interfaces" && folder !== "types")
          ? []
          : [folder]
      })
      return [exported.name, new globalThis.Set(folders)] as const
    }),
  )
}

/**
 * `src/<module>/index.ts` files where a type-only alias of a symbol (`export type { IO as IOType }`)
 * comes before the value export of the same symbol (`export { IO }`). TypeDoc then names the symbol's
 * pages after the alias, and `IO` itself gets none.
 */
const aliasFirstIndexes = (): ReadonlyArray<string> =>
  readdirSync(join(PACKAGE_ROOT, "src"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(PACKAGE_ROOT, "src", entry.name, "index.ts")))
    .flatMap((entry) => {
      const file = join("src", entry.name, "index.ts")
      const text = readFileSync(join(PACKAGE_ROOT, file), "utf8")
      const valueAt = (name: string): number =>
        [...text.matchAll(/^export \{([^}]*)\} from/gm)].find((m) =>
          (m[1] ?? "").split(",").some((spec) => spec.trim() === name),
        )?.index ?? -1
      return [...text.matchAll(/^export type \{([^}]*)\} from/gm)].flatMap((m) =>
        (m[1] ?? "").split(",").flatMap((spec) => {
          const [, original = "", alias] = /^\s*(\w+)\s+as\s+(\w+)\s*$/.exec(spec) ?? []
          const value = alias === undefined ? -1 : valueAt(original)
          return value > (m.index ?? 0)
            ? [`${file}: type ${original} as ${alias} comes before export { ${original} }`]
            : []
        }),
      )
    })

describe("docs site links", () => {
  it("every API reference link names a real export in the folder TypeDoc writes it to", () => {
    const folders = typedocFolders()
    const broken = linksMatching(/api-docs\/[A-Za-z_]+\/[A-Za-z0-9_$]+\.html/g).flatMap(({ file, url }) => {
      const [, folder = "", name = ""] = /api-docs\/([A-Za-z_]+)\/([A-Za-z0-9_$]+)\.html/.exec(url) ?? []
      return folders.get(name)?.has(folder) === true ? [] : [`${file}: ${url}`]
    })
    expect(broken).toEqual([])
  })

  it("module indexes export a value before its type-only alias, so TypeDoc names the pages after the value", () => {
    expect(aliasFirstIndexes()).toEqual([])
  })

  it("has API reference links to check", () => {
    expect(linksMatching(/api-docs\/[A-Za-z_]+\/[A-Za-z0-9_$]+\.html/g).length).toBeGreaterThan(10)
  })

  it("every source link points at a path in this repo", () => {
    const broken = linksMatching(/github\.com\/jordanburke\/functype\/(?:blob|tree)\/main\/[^\s"'`)]+/g).flatMap(
      ({ file, url }) => {
        const path = url.replace(/^github\.com\/jordanburke\/functype\/(?:blob|tree)\/main\//, "").replace(/#.*$/, "")
        return existsSync(join(REPO_ROOT, path)) ? [] : [`${file}: ${url}`]
      },
    )
    expect(broken).toEqual([])
  })
})
