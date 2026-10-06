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
  getContextualType(node: unknown): TypeLike | undefined
  isArrayLikeType(type: TypeLike): boolean
  getTypeOfSymbolAtLocation(symbol: unknown, node: unknown): TypeLike
  getTypeArguments(type: TypeLike): ReadonlyArray<TypeLike>
}

/** `ts.TypeFlags.Any` / `Unknown`, inlined so the plugin needs no runtime `typescript` import. */
const ANY_OR_UNKNOWN_FLAGS = 1 | 2

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

const isArrayLikeOrUntyped = (checker: CheckerLike, type: TypeLike): boolean => {
  const { flags, types } = type as { flags?: number; types?: ReadonlyArray<TypeLike> }
  if (flags !== undefined && (flags & ANY_OR_UNKNOWN_FLAGS) !== 0) return true
  if (types) return types.some((member) => isArrayLikeOrUntyped(checker, member))
  return checker.isArrayLikeType(type)
}

const isUntyped = (type: TypeLike): boolean => {
  const { flags } = type as { flags?: number }
  return flags !== undefined && (flags & ANY_OR_UNKNOWN_FLAGS) !== 0
}

/** The mutable `Array` type, as opposed to `ReadonlyArray`: the one a `ReadonlyArray` can't be passed to. */
const isMutableArrayType = (checker: CheckerLike, type: TypeLike): boolean => {
  const { types, symbol } = type as { types?: ReadonlyArray<TypeLike>; symbol?: { name?: string } }
  if (types) return types.some((member) => isMutableArrayType(checker, member))
  return symbol?.name === "Array" && checker.isArrayLikeType(type)
}

/** The name a property is written under: `params` in `{ params }`, `parts` in `{ parts: … }` or `{ "parts": … }`. */
const propertyKey = (property: ASTNode): string | null => {
  if (property.computed) return null
  if (property.key?.type === "Identifier") return property.key.name
  return property.key?.type === "Literal" && typeof property.key.value === "string" ? property.key.value : null
}

/**
 * The expected type of `node`, looking through object literals when TypeScript gives the value none of
 * its own. Two cases: a shorthand `{ params }` passed to a function, where the expected type is that
 * property's type on the parameter; and `[…]` in `JSON.stringify({ parts: [...] })`, where the object is
 * passed to an `any` parameter, so the whole object is going to an untyped host.
 */
const expectedType = (checker: CheckerLike, services: TypedServices, node: ASTNode): TypeLike | undefined => {
  const tsNode = services.esTreeNodeToTSNodeMap.get(node)
  const own = tsNode ? checker.getContextualType(tsNode) : undefined
  if (own !== undefined) return own
  const parent = node.parent as ASTNode | undefined
  const objectLiteral = parent?.type === "Property" && parent.value === node ? (parent.parent as ASTNode) : undefined
  if (objectLiteral?.type !== "ObjectExpression") return undefined
  const outer = expectedType(checker, services, objectLiteral)
  if (outer === undefined || isUntyped(outer)) return outer
  const key = propertyKey(parent as ASTNode)
  const member = key === null ? undefined : checker.getPropertyOfType(outer, key)
  return member === undefined ? undefined : checker.getTypeOfSymbolAtLocation(member, tsNode)
}

/**
 * Does `node` (an expression) flow into a slot that is typed as an array, a tuple or `any`/`unknown`?
 * That's the expected type TypeScript checks it against: the parameter it is passed to, the property
 * it initialises, the declared return type. A literal in such a slot is handed to code that requires an
 * array, such as drizzle's `.values([...])` or an index definition, so `List` can't go there. A literal
 * inside an object passed to an `any` parameter (a `JSON.stringify` request body) counts too.
 *
 * `undefined` when type information isn't available, or when there is no expected type (a free-standing
 * literal), so the caller can fall back.
 */
export const flowsIntoArraySlot = (node: ASTNode, context: Rule.RuleContext): boolean | undefined => {
  const services = typedServices(context)
  if (!services) return undefined
  const checker = services.program.getTypeChecker()
  const expected = expectedType(checker, services, node)
  return expected === undefined ? undefined : isArrayLikeOrUntyped(checker, expected)
}

/**
 * Does `node` flow into a slot that requires a *mutable* array — a parameter typed `T[]`, such as pg's
 * `query(text, values: unknown[])`, drizzle's `inArray(col, values)` or ReactFlow's `nodes`? There a
 * `ReadonlyArray` won't type-check, so a mutable annotation is what the library demands.
 *
 * `undefined` when type information isn't available.
 */
export const flowsIntoMutableArraySlot = (node: ASTNode, context: Rule.RuleContext): boolean | undefined => {
  const services = typedServices(context)
  if (!services) return undefined
  const checker = services.program.getTypeChecker()
  const expected = expectedType(checker, services, node)
  return expected !== undefined && isMutableArrayType(checker, expected)
}

/**
 * Is `node`'s own type `any` / `unknown`, or an array of them — `JSON.parse(raw)`, `await res.json()`,
 * `raw` after `Array.isArray(raw)` (narrowed to `any[]`)? `undefined` when type information isn't available.
 */
export const isUntypedExpression = (node: ASTNode, context: Rule.RuleContext): boolean | undefined => {
  const services = typedServices(context)
  if (!services) return undefined
  const tsNode = services.esTreeNodeToTSNodeMap.get(node)
  if (!tsNode) return undefined
  const checker = services.program.getTypeChecker()
  const type = checker.getTypeAtLocation(tsNode)
  if (isUntyped(type)) return true
  if (!checker.isArrayLikeType(type)) return false
  const element = checker.getTypeArguments(type)[0]
  return element !== undefined && isUntyped(element)
}
