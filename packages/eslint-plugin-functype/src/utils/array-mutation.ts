import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"

/**
 * Type checks for `no-array-mutation`, reached through `parserServices` and typed structurally so the
 * plugin takes no runtime dependency on `typescript`. Every check answers `false` without type
 * information: the rule reports nothing it can't prove is an array.
 */

type TypeLike = object

type CheckerLike = {
  getTypeAtLocation(node: unknown): TypeLike
  getNonNullableType(type: TypeLike): TypeLike
  isArrayLikeType(type: TypeLike): boolean
  isTupleType(type: TypeLike): boolean
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
 * The mutable `Array` type, or a non-readonly tuple — `ReadonlyArray` has no `push`, so TypeScript
 * already rejects mutating one. Every member of a union must be one, so `string[] | Set<string>`
 * isn't reported on a `.push` the compiler resolves some other way.
 */
const isMutableArray = (checker: CheckerLike, type: TypeLike): boolean => {
  const { types, symbol, target } = type as {
    types?: ReadonlyArray<TypeLike>
    symbol?: { name?: string }
    target?: { readonly?: boolean }
  }
  if (types) return types.length > 0 && types.every((member) => isMutableArray(checker, member))
  if (checker.isTupleType(type)) return target?.readonly !== true
  return symbol?.name === "Array" && checker.isArrayLikeType(type)
}

/** Is `node` (an expression) typed as a mutable array? `false` without type information. */
export const isMutableArrayExpression = (node: ASTNode, context: Rule.RuleContext): boolean => {
  const services = typedServices(context)
  const tsNode = services?.esTreeNodeToTSNodeMap.get(node)
  if (!services || !tsNode) return false
  const checker = services.program.getTypeChecker()
  return isMutableArray(checker, checker.getNonNullableType(checker.getTypeAtLocation(tsNode)))
}
