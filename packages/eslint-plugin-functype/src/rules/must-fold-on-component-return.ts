import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { INTEROP_TAG, isInsideTaggedDeclaration } from "../utils/boundary-tags"
import { MATCH_COMPONENT, predicateCall } from "../utils/functype-predicates"
import { enclosingFunction, producesJSX, renderKind } from "../utils/react-render"
import { isExtractableByType } from "../utils/type-aware"

/**
 * Reports a component that chooses what it renders by asking an Option / Either / Try which case it
 * holds, in the two shapes `prefer-fold` leaves alone:
 *
 * - an early return: `if (user.isNone()) return <SignIn />`, then the other case below it;
 * - a short-circuit: `{user.isSome() && <Profile />}`, which renders one case and drops the other.
 *
 * A ternary or an if/else on `isSome()` / `isLeft()` / … is `prefer-fold`'s, everywhere, so this rule
 * doesn't report it a second time.
 *
 * Only a functype predicate *call* counts. `state.isPending` (a `useIO` result) and `items.isEmpty` are
 * properties, never calls, so they're not reported. With type information the receiver must also be a
 * functype container.
 */

/** `return x` alone, or as the only statement of a block: what an early-return guard hands back. */
const returnedValue = (consequent: ASTNode): ASTNode | null | undefined => {
  const statement =
    consequent.type === "BlockStatement" && consequent.body.length === 1 ? consequent.body[0] : consequent
  return statement?.type === "ReturnStatement" ? (statement.argument ?? null) : undefined
}

const isNullLiteral = (node: ASTNode): boolean => node?.type === "Literal" && node.value === null

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require a React component to render an Option, Either or Try with fold or a Match component, not an isSome()/isLeft() guard or &&",
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
      guardReturn:
        "This component picks what it renders with an early return on {{receiver}}.{{method}}(). Render both cases in one expression: {{receiver}}.fold(…) or <{{matcher}}>, so neither branch reads a value that isn't there.",
      shortCircuit:
        "{{receiver}}.{{method}}() && … renders one case and drops the other. Use {{receiver}}.fold(…) with null for the case that renders nothing, or <{{matcher}}>.",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const allowInteropMarker = options.allowInteropMarker !== false
    const sourceCode = context.sourceCode

    /** The predicate `test` calls, when `node` sits directly in a component's body (not a nested callback). */
    const componentPredicate = (node: ASTNode, test: ASTNode) => {
      const predicate = predicateCall(test, sourceCode)
      if (!predicate) return null
      const fn = enclosingFunction(node)
      if (!fn || renderKind(fn) !== "component") return null
      if (isExtractableByType(predicate.receiver, context) === false) return null
      if (allowInteropMarker && isInsideTaggedDeclaration(node, INTEROP_TAG, sourceCode)) return null
      return predicate
    }

    const report = (node: ASTNode, messageId: string, predicate: NonNullable<ReturnType<typeof componentPredicate>>) =>
      context.report({
        node,
        messageId,
        data: {
          receiver: sourceCode.getText(predicate.receiver),
          method: predicate.method,
          matcher: MATCH_COMPONENT[predicate.method] ?? "Match",
        },
      })

    return {
      IfStatement(node: ASTNode) {
        // An if/else is prefer-fold's. A guard is an `if` with no `else` that returns JSX or `null`.
        if (node.alternate) return
        const returned = returnedValue(node.consequent)
        if (returned === undefined || !(producesJSX(returned) || isNullLiteral(returned))) return
        const predicate = componentPredicate(node, node.test)
        if (predicate) report(node, "guardReturn", predicate)
      },

      LogicalExpression(node: ASTNode) {
        if (node.operator !== "&&" || !producesJSX(node.right)) return
        const predicate = componentPredicate(node, node.left)
        if (predicate) report(node, "shortCircuit", predicate)
      },
    }
  },
}

export default rule
