import type { Rule, SourceCode } from "eslint"

import type { ASTNode } from "../types/ast"
import { INTEROP_TAG, isInsideTaggedDeclaration } from "../utils/boundary-tags"
import { compact, predicateCall } from "../utils/functype-predicates"
import { enclosingFunction, renderKind } from "../utils/react-render"
import { isExtractableByType } from "../utils/type-aware"

/**
 * The extractors that throw a generic error when the value is missing. `orThrow` is the one functype's
 * containers carry; `getOrThrow` is its older name, which the rule is named after. Each is reported only
 * bare: `orThrow(error)` names the error, the way to send a failure to an error boundary on purpose.
 * `expect(handler)` is never reported, because its handler is the chosen throw.
 */
const THROWING_METHODS: ReadonlySet<string> = new Set(["orThrow", "getOrThrow"])

/**
 * Is the call inside a branch that already proved the value is there? `o.isSome() ? o.orThrow() : …`,
 * `if (e.isRight()) return e.orThrow()`, `t.isSuccess() && t.orThrow()`, or after an early exit on the
 * other case: `if (o.isNone()) return null` earlier in an enclosing block. Then the call cannot throw.
 */
const isGuarded = (call: ASTNode, stop: ASTNode, receiverText: string, sourceCode: SourceCode): boolean => {
  const proves = (test: ASTNode, present: boolean): boolean => {
    const predicate = predicateCall(test, sourceCode)
    return predicate !== null && predicate.receiverText === receiverText && predicate.isNegated !== present
  }
  const exitsEarly = (statement: ASTNode): boolean =>
    statement.type === "IfStatement" &&
    !statement.alternate &&
    proves(statement.test, false) &&
    (statement.consequent.type === "ReturnStatement" ||
      statement.consequent.type === "ThrowStatement" ||
      (statement.consequent.type === "BlockStatement" &&
        ["ReturnStatement", "ThrowStatement"].includes(statement.consequent.body.at(-1)?.type)))

  const walk = (child: ASTNode, node: ASTNode | undefined): boolean => {
    if (!node || node === stop) return false
    const branch = node.type === "IfStatement" || node.type === "ConditionalExpression"
    if (branch && node.consequent === child && proves(node.test, true)) return true
    if (branch && node.alternate === child && proves(node.test, false)) return true
    if (node.type === "LogicalExpression" && node.operator === "&&" && node.right === child && proves(node.left, true))
      return true
    if (node.type === "BlockStatement") {
      const before = (node.body as ReadonlyArray<ASTNode>).slice(0, node.body.indexOf(child))
      if (before.some(exitsEarly)) return true
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
