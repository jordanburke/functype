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
  getResolvedSignature(node: unknown): { readonly parameters: ReadonlyArray<unknown> } | undefined
  getIndexInfoOfType(type: TypeLike, kind: number): { readonly type: TypeLike } | undefined
}

/** `ts.TypeFlags.Any` / `Unknown`, inlined so the plugin needs no runtime `typescript` import. */
const ANY_OR_UNKNOWN_FLAGS = 1 | 2
/** `ts.TypeFlags.TypeParameter`: a generic sink such as Hono's `c.json<T>(data: T)`. */
const TYPE_PARAMETER_FLAG = 1 << 18

/** Interfaces a consumer reads through rather than keeps: `importKey(…, usages: Iterable<KeyUsage>)`, `new Set(values)`. */
const CONSUMED_COLLECTION_TYPES: ReadonlySet<string> = new Set([
  "Iterable",
  "AsyncIterable",
  "IterableIterator",
  "ArrayLike",
])

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
  const { flags, types, symbol } = type as {
    flags?: number
    types?: ReadonlyArray<TypeLike>
    symbol?: { name?: string }
  }
  if (flags !== undefined && (flags & (ANY_OR_UNKNOWN_FLAGS | TYPE_PARAMETER_FLAG)) !== 0) return true
  if (types) return types.some((member) => isArrayLikeOrUntyped(checker, member))
  if (symbol?.name !== undefined && CONSUMED_COLLECTION_TYPES.has(symbol.name)) return true
  return checker.isArrayLikeType(type)
}

const isUntyped = (type: TypeLike): boolean => {
  const { flags } = type as { flags?: number }
  return flags !== undefined && (flags & ANY_OR_UNKNOWN_FLAGS) !== 0
}

/** Untyped, or a bare type parameter: an object handed to `json<T>(data: T)` goes to a generic sink. */
const isOpaqueSink = (type: TypeLike): boolean => {
  const { flags } = type as { flags?: number }
  return flags !== undefined && (flags & (ANY_OR_UNKNOWN_FLAGS | TYPE_PARAMETER_FLAG)) !== 0
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
const expectedType = (
  checker: CheckerLike,
  services: TypedServices,
  node: ASTNode,
  context: Rule.RuleContext,
  depth = 0,
): TypeLike | undefined => {
  if (depth > 4) return undefined
  const tsNode = services.esTreeNodeToTSNodeMap.get(node)
  const own = tsNode ? checker.getContextualType(tsNode) : undefined
  if (own !== undefined) return own
  const parent = node.parent as ASTNode | undefined
  // `const metadata = (url) => ({ … })` with no declared return type: the object goes wherever the
  // calls' results go (`c.json(metadata(url))`), so take the expected type at the first call site.
  if (parent?.type === "ArrowFunctionExpression" && parent.body === node) {
    const declarator = parent.parent as ASTNode | undefined
    if (
      declarator?.type === "VariableDeclarator" &&
      declarator.init === parent &&
      declarator.id?.type === "Identifier"
    ) {
      const variable = context.sourceCode.getDeclaredVariables(declarator)[0]
      const calls = (variable?.references ?? [])
        .map((ref) => (ref.identifier as unknown as ASTNode).parent as ASTNode | undefined)
        .filter((call): call is ASTNode => call?.type === "CallExpression")
      return calls
        .map((call) => expectedType(checker, services, call, context, depth + 1))
        .find((type) => type !== undefined)
    }
  }
  // An argument to an overloaded function (`crypto.subtle.importKey(…, ["decrypt"])`) gets no contextual
  // type; the parameter of the overload TypeScript picked is the expected type.
  if ((parent?.type === "CallExpression" || parent?.type === "NewExpression") && parent.callee !== node) {
    const index = (parent.arguments as ReadonlyArray<ASTNode>).indexOf(node)
    const call = services.esTreeNodeToTSNodeMap.get(parent)
    const parameter = index >= 0 && call ? checker.getResolvedSignature(call)?.parameters[index] : undefined
    return parameter === undefined ? undefined : checker.getTypeOfSymbolAtLocation(parameter, call)
  }
  const objectLiteral = parent?.type === "Property" && parent.value === node ? (parent.parent as ASTNode) : undefined
  if (objectLiteral?.type !== "ObjectExpression") return undefined
  const outer = expectedType(checker, services, objectLiteral, context, depth + 1)
  if (outer === undefined || isOpaqueSink(outer)) return outer
  const key = propertyKey(parent as ASTNode)
  // `{ [k]: [...] }` (a reduce accumulator keyed by category): the property named by the key's literal
  // type, else the string index signature's type.
  if (key === null) {
    const keyNode = (parent as ASTNode).key
    const keyTs = keyNode ? services.esTreeNodeToTSNodeMap.get(keyNode) : undefined
    const keyType = keyTs
      ? (checker.getTypeAtLocation(keyTs) as { value?: unknown; types?: ReadonlyArray<{ value?: unknown }> })
      : undefined
    const literal = keyType?.value ?? keyType?.types?.[0]?.value
    const named = typeof literal === "string" ? checker.getPropertyOfType(outer, literal) : undefined
    return named !== undefined
      ? checker.getTypeOfSymbolAtLocation(named, tsNode)
      : checker.getIndexInfoOfType(outer, 0)?.type
  }
  const member = checker.getPropertyOfType(outer, key)
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
  const expected = expectedType(checker, services, node, context)
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
  const expected = expectedType(checker, services, node, context)
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
