import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

/**
 * Type-aware helpers that work only when the consumer turns on type-aware linting
 * (`parserOptions.projectService` or `project`). Without it they report "unknown", and a rule
 * falls back to its syntactic heuristic.
 *
 * The checker is reached through `parserServices` and typed structurally here, so the plugin
 * takes no runtime dependency on `typescript`.
 */

type TypeLike = object

type CheckerLike = {
  getTypeAtLocation(node: unknown): TypeLike
  getNonNullableType(type: TypeLike): TypeLike
  getPropertyOfType(type: TypeLike, name: string): unknown
}

type TypedServices = {
  readonly program: { getTypeChecker(): CheckerLike }
  readonly esTreeNodeToTSNodeMap: { get(node: unknown): unknown }
}

const typedServices = (context: Rule.RuleContext): TypedServices | undefined => {
  const services = context.sourceCode.parserServices as Partial<TypedServices> | undefined
  return services?.program && services.esTreeNodeToTSNodeMap ? (services as TypedServices) : undefined
}

/**
 * Is `node`'s type a functype extractable container (Option, Either, Try, Lazy, …)? Structural:
 * the type, after stripping `null` / `undefined`, has both `orThrow` and `fold` — true of every
 * functype container, including union types like `Either` (each member has both). Native
 * collections (`Map#get`) and arbitrary objects don't.
 *
 * `undefined` when type information isn't available, so the caller can fall back.
 */
export const isExtractableByType = (node: ASTNode, context: Rule.RuleContext): boolean | undefined => {
  const services = typedServices(context)
  if (!services) return undefined
  const tsNode = services.esTreeNodeToTSNodeMap.get(node)
  if (!tsNode) return undefined
  const checker = services.program.getTypeChecker()
  const type = checker.getNonNullableType(checker.getTypeAtLocation(tsNode))
  return (
    checker.getPropertyOfType(type, "orThrow") !== undefined && checker.getPropertyOfType(type, "fold") !== undefined
  )
}
