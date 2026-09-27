import type { Rule, SourceCode } from "eslint"

import type { ASTNode } from "../types/ast"
import { childNodes } from "../utils/ast-walk"

/** Methods on a monadic value that mean "this is the Some/Right/Success path." */
const POSITIVE_PREDICATES: ReadonlySet<string> = new Set(["isSome", "isRight", "isSuccess"])
/** Methods that mean "this is the None/Left/Failure path." */
// `isEmpty` is deliberately absent: it is a property on every functype container, never a method, so
// `x.isEmpty()` is not functype code (and on a List, `.fold` is a reduce, not a branch).
const NEGATIVE_PREDICATES: ReadonlySet<string> = new Set(["isNone", "isLeft", "isFailure"])

/**
 * How each container's fold exposes its failure side. `fold(onFailure, onSuccess)` everywhere, but
 * only Either and Try hand the failure callback a value — Option's `onNone` takes nothing. `member`
 * is the property a narrowed branch reads that value through (`e.value` after `isLeft()`,
 * `t.error` after `isFailure()`).
 */
type FailureSide = { readonly param: string; readonly member: string } | null

const FAILURE_SIDE: Readonly<Record<string, FailureSide>> = {
  isSome: null,
  isNone: null,
  isRight: { param: "left", member: "value" },
  isLeft: { param: "left", member: "value" },
  isSuccess: { param: "error", member: "error" },
  isFailure: { param: "error", member: "error" },
}

/** Reads of the success value that the fold's success parameter replaces. */
const SUCCESS_METHODS = ["get", "orThrow"]
const SUCCESS_MEMBER = "value"

/**
 * A literal `null` or the `undefined` identifier. A ternary that yields one of these in a branch is
 * building an optional value (prefer-option's concern), not folding a monad — so the untyped nullable
 * heuristic must not treat `x !== undefined ? "a" : undefined` as a fold candidate.
 */
function isNullishLiteral(node: ASTNode): boolean {
  return (node.type === "Literal" && node.value === null) || (node.type === "Identifier" && node.name === "undefined")
}

/**
 * If `test` is a monadic predicate call like `option.isSome()` or
 * `either.isLeft()`, returns the receiver expression's text plus whether the
 * predicate is the "absence" side. Returns null for anything else.
 */
function extractMonadicTest(
  test: ASTNode,
  sourceCode: SourceCode,
): { obj: string; isNegated: boolean; failure: FailureSide } | null {
  if (test.type !== "CallExpression" || test.callee.type !== "MemberExpression") return null
  const methodName = test.callee.property.name
  const obj = sourceCode.getText(test.callee.object)
  const failure = FAILURE_SIDE[methodName] ?? null
  if (POSITIVE_PREDICATES.has(methodName)) return { obj, isNegated: false, failure }
  if (NEGATIVE_PREDICATES.has(methodName)) return { obj, isNegated: true, failure }
  return null
}

/** Source text with all whitespace removed — receivers match however they are line-broken. */
const compact = (text: string): string => text.replace(/\s+/g, "")

/** Which reads of the narrowed receiver a fold parameter replaces. */
type Reads = { readonly members: ReadonlyArray<string>; readonly methods: ReadonlyArray<string> }

const SUCCESS_READS: Reads = { members: [SUCCESS_MEMBER], methods: SUCCESS_METHODS }

/**
 * Source ranges inside `branch` that read the narrowed receiver: `e.value`, `e!.value`, `e?.value`,
 * `e.orThrow()`. Driven by the AST rather than the text, so a read never matches inside a string or
 * template literal, a comment, a longer name, or another object's member (`other.e.value`). A member
 * that is called (`e.value()`) or assigned (`e.value = 3`) is not a read.
 */
function receiverReads(
  branch: ASTNode,
  receiver: string,
  reads: Reads,
  sourceCode: SourceCode,
): ReadonlyArray<readonly [number, number]> {
  const isReceiver = (node: ASTNode): boolean => {
    const target = node.type === "TSNonNullExpression" ? node.expression : node
    return compact(sourceCode.getText(target)) === compact(receiver)
  }
  const isMember = (node: ASTNode, names: ReadonlyArray<string>): boolean =>
    node.type === "MemberExpression" &&
    !node.computed &&
    node.property.type === "Identifier" &&
    names.includes(node.property.name) &&
    isReceiver(node.object)

  const visit = (node: ASTNode): ReadonlyArray<readonly [number, number]> => {
    const parent = node.parent
    const isCalled = parent?.type === "CallExpression" && parent.callee === node
    const isWritten =
      (parent?.type === "AssignmentExpression" && parent.left === node) || parent?.type === "UpdateExpression"
    if (isMember(node, reads.members) && !isCalled && !isWritten) return [node.range]
    if (node.type === "CallExpression" && node.arguments.length === 0 && isMember(node.callee, reads.methods)) {
      return [node.range]
    }
    return childNodes(node).flatMap(visit)
  }
  return visit(branch)
}

/** A parameter name no branch already uses, so the fold never shadows a captured identifier. */
const freshName = (base: string, branches: ReadonlyArray<string>): string => {
  // `(?<![\\w$.])`: a property access (`e.value`) is not a free identifier, so it cannot be shadowed.
  const isTaken = (name: string): boolean => branches.some((b) => new RegExp(`(?<![\\w$.])${name}(?![\\w$])`).test(b))
  const candidates = [base, ...Array.from({ length: 20 }, (_, i) => `${base}${i + 1}`)]
  return candidates.find((name) => !isTaken(name)) ?? `${base}_`
}

/**
 * An arrow body must not start with `{` (it would parse as a block) and a comma expression must stay
 * one argument, so those two shapes are parenthesized. ESTree ranges exclude the source's own parens.
 */
const asArrowBody = (node: ASTNode, text: string): string =>
  node.type === "ObjectExpression" || node.type === "SequenceExpression" ? `(${text})` : text

/**
 * One fold callback. Reads of the narrowed receiver become reads of the callback's parameter — the
 * receiver is NOT narrowed inside the callback, so leaving `e.value` there is a type error (#323).
 * A branch that never reads the value gets a parameterless callback, not an unused parameter.
 */
function foldCallback(
  branch: ASTNode,
  receiver: string,
  reads: Reads | null,
  param: string,
  sourceCode: SourceCode,
): string {
  const text = sourceCode.getText(branch)
  const ranges = reads === null ? [] : receiverReads(branch, receiver, reads, sourceCode)
  if (ranges.length === 0) return `() => ${asArrowBody(branch, text)}`
  const offset = branch.range[0]
  // Replace right-to-left so earlier offsets stay valid.
  const rewritten = [...ranges]
    .sort((a, b) => b[0] - a[0])
    .reduce((acc, [start, end]) => acc.slice(0, start - offset) + param + acc.slice(end - offset), text)
  return `(${param}) => ${asArrowBody(branch, rewritten)}`
}

/** `receiver.fold(onFailure, onSuccess)` from the two branch nodes. */
function buildFold(
  receiver: string,
  failure: FailureSide,
  failureNode: ASTNode,
  successNode: ASTNode,
  sourceCode: SourceCode,
): string {
  const branches = [sourceCode.getText(failureNode), sourceCode.getText(successNode)]
  const onSuccess = foldCallback(successNode, receiver, SUCCESS_READS, freshName("value", branches), sourceCode)
  const onFailure =
    failure === null
      ? foldCallback(failureNode, receiver, null, "", sourceCode)
      : foldCallback(
          failureNode,
          receiver,
          { members: [failure.member], methods: [] },
          freshName(failure.param, branches),
          sourceCode,
        )
  return `${receiver}.fold(${onFailure}, ${onSuccess})`
}

/** The returned expression of a `return x` statement or a `{ return x }` block; null for anything else. */
function returnedExpression(node: ASTNode): ASTNode | null {
  const statement = node.type === "BlockStatement" && node.body.length === 1 ? node.body[0] : node
  return statement.type === "ReturnStatement" && statement.argument ? statement.argument : null
}

/**
 * Length of an if/else-if/else chain rooted at `node`. Counts the root as 1
 * and adds 1 per linked alternate IfStatement. Terminates on a non-If
 * alternate (the final `else { ... }`) which counts as the last branch.
 */
function ifElseChainLength(node: ASTNode): number {
  if (!node.alternate) return 1
  if (node.alternate.type === "IfStatement") return 1 + ifElseChainLength(node.alternate as ASTNode)
  return 2 // root + the terminal else
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer .fold() over if/else chains when working with monadic types",
      recommended: true,
    },
    // Suggestions, never an autofix (#323): `ts-builds validate` runs `eslint --fix`, which applies
    // fixable rules at warn severity too, and a fold rewrite cannot be proven type-correct without type
    // information. The developer applies it, and the compiler checks it.
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          minComplexity: {
            type: "integer",
            minimum: 1,
            default: 2,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferFold: "Prefer .fold() over if/else when working with {{type}} types",
      preferFoldTernary: "Consider using .fold() instead of ternary operator for {{type}}",
      suggestFold: "Replace with .fold()",
      suggestOr:
        "Replace with {{receiver}}.or({{alternative}}) — keep the first when it is present, else the alternative",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const minComplexity = options.minComplexity || 2

    function generateFoldFromIf(node: ASTNode): string | null {
      const sourceCode = context.sourceCode
      if (node.type !== "IfStatement" || !node.alternate) return null

      const extracted = extractMonadicTest(node.test, sourceCode)
      if (!extracted) return null

      // Only if/else where both branches return a value — the fold then replaces the whole statement
      // as `return receiver.fold(...)`. Anything else (side effects, nested else-if) is left alone.
      const thenExpr = returnedExpression(node.consequent)
      const elseExpr = returnedExpression(node.alternate)
      if (!thenExpr || !elseExpr) return null

      // The suggestion keeps only the test and the two returned values; a comment anywhere else in the
      // statement would be silently dropped, so none is offered.
      const kept = [node.test, thenExpr, elseExpr]
      const within = (c: { range?: [number, number] }): boolean =>
        c.range !== undefined && kept.some((n) => c.range![0] >= n.range[0] && c.range![1] <= n.range[1])
      if (!sourceCode.getCommentsInside(node).every(within)) return null

      const { obj, isNegated, failure } = extracted
      const [failureExpr, successExpr] = isNegated ? [thenExpr, elseExpr] : [elseExpr, thenExpr]
      return `return ${buildFold(obj, failure, failureExpr, successExpr, sourceCode)}`
    }

    function ternarySuggestions(node: ASTNode): Rule.SuggestionReportDescriptor[] {
      const sourceCode = context.sourceCode
      const extracted = extractMonadicTest(node.test, sourceCode)
      if (!extracted) return []

      const { obj, isNegated, failure } = extracted
      const [failureNode, successNode] = isNegated
        ? [node.consequent, node.alternate]
        : [node.alternate, node.consequent]
      const failureText = sourceCode.getText(failureNode)
      const successText = sourceCode.getText(successNode)

      // `a.isSome() ? a : b` keeps the container when present and falls back otherwise — that is `.or`,
      // and a fold would only rebuild it with an unused parameter. `.or` takes a container, so a literal
      // or `undefined` fallback gets no suggestion at all: neither `.or(5)` nor a fold mixing a container
      // with a plain value would type-check.
      if (compact(successText) === compact(obj)) {
        if (failureNode.type === "Literal" || failureNode.type === "TemplateLiteral" || isNullishLiteral(failureNode)) {
          return []
        }
        return [
          {
            messageId: "suggestOr",
            data: { receiver: obj, alternative: failureText },
            fix: (fixer) => fixer.replaceText(node, `${obj}.or(${failureText})`),
          },
        ]
      }

      const fold = buildFold(obj, failure, failureNode, successNode, sourceCode)
      return [{ messageId: "suggestFold", fix: (fixer) => fixer.replaceText(node, fold) }]
    }

    function isFunctypePredicateCall(node: ASTNode): boolean {
      // Suggest a rewrite only when the test is a functype predicate call (the receiver is a functype value)
      if (node.type === "CallExpression" && node.callee.type === "MemberExpression") {
        const methodName = node.callee.property.name
        // These methods indicate the object is already a functype instance
        return ["isSome", "isNone", "isRight", "isLeft", "isSuccess", "isFailure"].includes(methodName)
      }
      return false
    }

    // `via` records HOW we matched: a functype predicate call (`method`, precise) vs the untyped
    // null/undefined heuristic (`nullable`, a guess that can't tell a real Option from a plain nullable).
    function isMonadicCheck(node: ASTNode): { isMonadic: boolean; type: string; via: "method" | "nullable" | "" } {
      const sourceCode = context.sourceCode
      const text = sourceCode.getText(node)

      // Check for common monadic type checks
      if (/\.(isSome|isNone|isDefined)\s*\(\s*\)/.test(text)) {
        return { isMonadic: true, type: "Option", via: "method" }
      }

      if (/\.(isLeft|isRight)\s*\(\s*\)/.test(text)) {
        return { isMonadic: true, type: "Either", via: "method" }
      }

      if (/\.(isSuccess|isFailure)\s*\(\s*\)/.test(text)) {
        return { isMonadic: true, type: "Result", via: "method" }
      }

      // Check for null/undefined checks on variables that might be Options
      if (node.type === "BinaryExpression") {
        if (
          (node.operator === "===" || node.operator === "!==" || node.operator === "==" || node.operator === "!=") &&
          ((node.left.type === "Literal" && (node.left.value === null || node.left.value === undefined)) ||
            (node.right.type === "Literal" && (node.right.value === null || node.right.value === undefined)))
        ) {
          return { isMonadic: true, type: "Option", via: "nullable" }
        }

        // Check for === or == with undefined identifier
        if (node.operator === "==" || node.operator === "!=" || node.operator === "===" || node.operator === "!==") {
          const leftIsUndefined = node.left.type === "Identifier" && node.left.name === "undefined"
          const rightIsUndefined = node.right.type === "Identifier" && node.right.name === "undefined"

          if (leftIsUndefined || rightIsUndefined) {
            return { isMonadic: true, type: "Option", via: "nullable" }
          }
        }
      }

      return { isMonadic: false, type: "", via: "" }
    }

    function suggestionsForIf(node: ASTNode): Rule.SuggestionReportDescriptor[] {
      if (!isFunctypePredicateCall(node.test)) return []
      const replacement = generateFoldFromIf(node)
      return replacement ? [{ messageId: "suggestFold", fix: (fixer) => fixer.replaceText(node, replacement) }] : []
    }

    function analyzeIfStatement(node: ASTNode) {
      const test = node.test
      const monadicInfo = isMonadicCheck(test)

      if (!monadicInfo.isMonadic) return

      // Don't analyze if this is part of a larger if/else chain
      // (only analyze the outermost if statement)
      if (node.parent && node.parent.type === "IfStatement") return

      // Count the complexity (if/else if/else chain)
      if (ifElseChainLength(node) >= minComplexity) {
        context.report({
          node,
          messageId: "preferFold",
          data: { type: monadicInfo.type },
          suggest: suggestionsForIf(node),
        })
      }
    }

    return {
      IfStatement(node: ASTNode) {
        analyzeIfStatement(node)
      },

      ConditionalExpression(node: ASTNode) {
        const monadicInfo = isMonadicCheck(node.test)
        // The untyped nullable heuristic can't distinguish a real Option from a plain nullable primitive.
        // When it fires on a ternary that yields `undefined`/`null` in a branch, that's optional value
        // construction (prefer-option's concern), not a fold — skip it. False positive this kills:
        // `x !== undefined ? "a" : undefined`. Predicate-call matches (`.isSome()` etc.) are unaffected.
        if (monadicInfo.via === "nullable" && (isNullishLiteral(node.consequent) || isNullishLiteral(node.alternate))) {
          return
        }
        if (monadicInfo.isMonadic) {
          context.report({
            node,
            messageId: "preferFoldTernary",
            data: { type: monadicInfo.type },
            suggest: isFunctypePredicateCall(node.test) ? ternarySuggestions(node) : [],
          })
        }
      },
    }
  },
}

export default rule
