import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { COLLECTION_NAMES, functypeCollectionAt } from "../utils/collection-binding"

/**
 * functype's `Map` / `Set` are the default collections (Scala-style): import them under their own names,
 * and spell the built-in `globalThis.Map` / `globalThis.Set` where it is genuinely needed.
 *
 * Two defects:
 * - `new Map()` on functype's Map. It's a factory, so TypeScript only says TS7009 ("target lacks a construct
 *   signature, implicitly has an 'any' type"), or TS2350 ("Only a void function can be called with the 'new'
 *   keyword") when `noImplicitAny` is off. Neither says what to write instead. This message does.
 * - `import { Map as FMap } from "functype"`. Aliases let a file keep the built-in under the plain name,
 *   which inverts the convention and drifts (`FMap`, `FMapOf`, `IMap`…). `allowAlias: true` opts out.
 *
 * Applies in test files too: tests are read as examples, by people and agents.
 */
const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Use functype's Map/Set under their own names; spell the built-in globalThis.Map/globalThis.Set",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowAlias: {
            type: "boolean",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      newFunctypeCollection:
        "functype's {{name}} is a factory, not a class: use {{local}}(…) or {{local}}.empty(). For the built-in, write new globalThis.{{name}}(…)",
      aliasedImport:
        "Import functype's {{name}} as {{name}}, not {{local}}: functype's {{name}} is the default collection. Spell the built-in globalThis.{{name}}",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowAlias = options.allowAlias === true

    return {
      NewExpression(node: ASTNode) {
        const hit = functypeCollectionAt(node.callee, context.sourceCode)
        if (hit === null) return
        context.report({ node, messageId: "newFunctypeCollection", data: hit })
      },

      ImportDeclaration(node: ASTNode) {
        if (allowAlias) return
        const source = node.source?.value
        if (typeof source !== "string" || !(source === "functype" || source.startsWith("functype/"))) return
        ;(node.specifiers as ReadonlyArray<ASTNode>)
          .filter(
            (spec) =>
              spec.type === "ImportSpecifier" &&
              spec.imported?.type === "Identifier" &&
              COLLECTION_NAMES.includes(spec.imported.name) &&
              spec.local.name !== spec.imported.name,
          )
          .forEach((spec) =>
            context.report({
              node: spec,
              messageId: "aliasedImport",
              data: { name: spec.imported.name, local: spec.local.name },
            }),
          )
      },
    }
  },
}

export default rule
