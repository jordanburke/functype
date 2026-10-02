import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { INTEROP_TAG, isInsideTaggedDeclaration } from "../utils/boundary-tags"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"

/** True iff any ancestor of `node` is a `CatchClause`. Pure tail recursion. */
function insideCatchClause(node: ASTNode | null | undefined): boolean {
  const parent = node?.parent as ASTNode | undefined
  if (!parent) return false
  return parent.type === "CatchClause" || insideCatchClause(parent)
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Use Either/Left/Right for typed domain errors instead of throwing",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInteropMarker: {
            type: "boolean",
            default: true,
          },
          allowThrowInTests: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferEitherOverThrow:
        "Prefer Either.left(error) over throw statement. For a bug check use invariant(); for a host that needs the throw, tag the function @interop",
      preferEitherReturn:
        "Consider returning Either<Error, {{type}}> instead of throwing. For a bug check use invariant(); for a host that needs the throw, tag the function @interop",
      suggestEitherLeft: "Replace with Either.left(...)",
      suggestAddImport: "Add {{symbol}} import from functype",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    // `@interop <reason>` on an enclosing declaration marks a host-contract boundary (#241).
    const allowInteropMarker = options.allowInteropMarker !== false
    // Bug checks are `invariant()` calls from functype (#342): a call, not a throw, so nothing to exempt.
    const isExemptByMarker = (node: ASTNode): boolean =>
      allowInteropMarker && isInsideTaggedDeclaration(node, INTEROP_TAG, context.sourceCode)
    const allowThrowInTests = options.allowThrowInTests !== false

    function isInTestFile() {
      const filename = context.filename
      return (
        /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename) ||
        filename.includes("__tests__") ||
        filename.includes("/test/") ||
        filename.includes("/tests/")
      )
    }

    /** The nearest function the throw belongs to — a nested function owns its own throws. */
    function enclosingFunction(node: ASTNode): ASTNode | null {
      const parent = node.parent
      if (!parent) return null
      return isFunctionLike(parent) ? parent : enclosingFunction(parent)
    }

    /** The declared return type when the function declares one that is not already an Either. */
    function nonEitherReturnType(fn: ASTNode | null): string | null {
      const returnType = fn?.returnType?.typeAnnotation
      if (!returnType) return null
      const text = context.sourceCode.getText(returnType)
      return text.includes("Either") ? null : text
    }

    function isFunctionLike(node: ASTNode): boolean {
      if (!node) return false
      return ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"].includes(node.type)
    }

    function isDirectInFunctionBody(node: ASTNode): boolean {
      const parent = node.parent
      if (!parent) return false
      if (parent.type === "BlockStatement" && isFunctionLike(parent.parent)) return true
      if (parent.type === "BlockStatement" && parent.parent?.type === "IfStatement") {
        const ifParent = parent.parent.parent
        return ifParent?.type === "BlockStatement" && isFunctionLike(ifParent.parent)
      }
      return false
    }

    return {
      ThrowStatement(node: ASTNode) {
        if (isExemptByMarker(node)) return
        // Allow throws in test files if configured
        if (allowThrowInTests && isInTestFile()) return

        // Allow re-throwing in catch blocks (common pattern)
        if (insideCatchClause(node)) return

        const sourceCode = context.sourceCode
        const suggest: Rule.SuggestionReportDescriptor[] = []

        if (isDirectInFunctionBody(node)) {
          const throwArg = node.argument
          const argText = sourceCode.getText(throwArg)
          const isErrorExpr =
            throwArg?.type === "NewExpression" &&
            throwArg.callee?.type === "Identifier" &&
            throwArg.callee.name === "Error"
          const eitherArg = isErrorExpr ? argText : `new Error(String(${argText}))`

          suggest.push({
            messageId: "suggestEitherLeft",
            fix(fixer) {
              return fixer.replaceText(node, `return Either.left(${eitherArg})`)
            },
          })

          if (!hasFunctypeSymbol(sourceCode, "Either")) {
            suggest.push({
              messageId: "suggestAddImport",
              data: { symbol: "Either" },
              fix: createImportFixer(sourceCode, "Either"),
            })
          }
        }

        // One report per throw (#324). When the enclosing function declares a non-Either return type,
        // the message names the Either it should return instead of reporting the function separately.
        const returnType = nonEitherReturnType(enclosingFunction(node))
        context.report({
          node,
          ...(returnType === null
            ? { messageId: "preferEitherOverThrow" }
            : { messageId: "preferEitherReturn", data: { type: returnType } }),
          suggest,
        })
      },
    }
  },
}

export default rule
