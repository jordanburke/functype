import type { Rule, SourceCode } from "eslint"

import type { ASTNode } from "../types/ast"
import { INTEROP_TAG, isInsideTaggedDeclaration } from "../utils/boundary-tags"
import { compact, provesWhen } from "../utils/functype-predicates"
import { enclosingFunction, renderKind } from "../utils/react-render"
import { isExtractableByType } from "../utils/type-aware"

/**
 * The extractors that throw a generic error when the value is missing. `orThrow` is the one functype's
 * containers carry; `getOrThrow` is its older name, which the rule is named after. Each is reported only
 * bare: `orThrow(error)` names the error, the way to send a failure to an error boundary on purpose.
 * `expect(handler)` is never reported, because its handler is the chosen throw.
 */
const THROWING_METHODS: ReadonlySet<string> = new Set(["orThrow", "getOrThrow"])

/** A statement that leaves the function: `return …`, `throw …`, or a block that ends in one. */
const exits = (statement: ASTNode): boolean =>
  statement.type === "ReturnStatement" ||
  statement.type === "ThrowStatement" ||
  (statement.type === "BlockStatement" && statement.body.length > 0 && exits(statement.body.at(-1)))

/**
 * Does `statement` only let control continue past it once the value is known to be there?
 *
 * - an early exit on the missing case: `if (!o.isSome()) return null`, `if (busy || o.isNone()) return <S />`,
 *   `if (o.isEmpty) throw …`;
 * - an if / else-if chain whose every branch exits, except the way out that proves it:
 *   `if (x) return <B />; else if (o.isNone()) return null`;
 * - `invariant(o.isSome(), "…")` from functype, which narrows the code after it.
 */
const continuesWithValue = (statement: ASTNode, receiverText: string, sourceCode: SourceCode): boolean => {
  if (statement.type === "IfStatement") {
    if (!exits(statement.consequent)) return false
    if (provesWhen(statement.test, false, receiverText, sourceCode) === "present") return true
    return statement.alternate ? continuesWithValue(statement.alternate, receiverText, sourceCode) : false
  }
  const call = statement.type === "ExpressionStatement" ? statement.expression : null
  return (
    call?.type === "CallExpression" &&
    call.callee.type === "Identifier" &&
    call.callee.name === "invariant" &&
    call.arguments.length > 0 &&
    provesWhen(call.arguments[0], true, receiverText, sourceCode) === "present"
  )
}

/**
 * Is the call inside a branch that already proved the value is there? `o.isSome() ? o.orThrow() : …`,
 * `!o.isSome() ? null : o.orThrow()`, `if (e.isRight()) return e.orThrow()`, `t.isSuccess() && t.orThrow()`,
 * or after a statement in an enclosing block that only continues once it is (`continuesWithValue`). Then
 * the call cannot throw.
 */
const isGuarded = (call: ASTNode, stop: ASTNode, receiverText: string, sourceCode: SourceCode): boolean => {
  const present = (test: ASTNode, outcome: boolean): boolean =>
    provesWhen(test, outcome, receiverText, sourceCode) === "present"

  const walk = (child: ASTNode, node: ASTNode | undefined): boolean => {
    if (!node || node === stop) return false
    const branch = node.type === "IfStatement" || node.type === "ConditionalExpression"
    if (branch && node.consequent === child && present(node.test, true)) return true
    if (branch && node.alternate === child && present(node.test, false)) return true
    if (node.type === "LogicalExpression" && node.right === child) {
      if (node.operator === "&&" && present(node.left, true)) return true
      if (node.operator === "||" && present(node.left, false)) return true
    }
    if (node.type === "BlockStatement") {
      const before = (node.body as ReadonlyArray<ASTNode>).slice(0, node.body.indexOf(child))
      if (before.some((statement) => continuesWithValue(statement, receiverText, sourceCode))) return true
    }
    return walk(node, node.parent)
  }
  return walk(call, call.parent)
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow a throwing extractor (.orThrow(), .getOrThrow()) in a React component or hook body",
      recommended: false,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowInteropMarker: {
            type: "boolean",
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      throwInRender:
        "{{receiver}}.{{method}}() throws during render when the value is missing, and a throw in render unmounts the tree up to the nearest error boundary. Render both cases with .fold(…) or <MatchOption> / <MatchEither> / <MatchTry>, or read a fallback with .orElse(…). To reach an error boundary on purpose, name the error: .orThrow((e) => new MyError(e))",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    // `@interop <reason>` on an enclosing declaration marks a host contract, such as React's `use()`.
    const allowInteropMarker = options.allowInteropMarker !== false
    const sourceCode = context.sourceCode

    return {
      CallExpression(node: ASTNode) {
        const callee = node.callee as ASTNode
        if (callee.type !== "MemberExpression" || callee.computed || callee.property.type !== "Identifier") return
        const method = callee.property.name as string
        if (!THROWING_METHODS.has(method) || node.arguments.length > 0) return

        // Only the component's or hook's own body runs during render. An event handler, an effect or a
        // `.map` callback is a separate function, so a call there is not attributed to the render.
        const fn = enclosingFunction(node)
        if (!fn || renderKind(fn) === null) return

        // With type information the receiver must be a functype container (it has `orThrow` and `fold`);
        // without it, the method name decides — `orThrow()` is functype's own spelling.
        if (isExtractableByType(callee.object, context) === false) return
        const receiverText = compact(sourceCode.getText(callee.object))
        if (isGuarded(node, fn, receiverText, sourceCode)) return
        if (allowInteropMarker && isInsideTaggedDeclaration(node, INTEROP_TAG, sourceCode)) return

        context.report({
          node,
          messageId: "throwInRender",
          data: { receiver: sourceCode.getText(callee.object), method },
        })
      },
    }
  },
}

export default rule
