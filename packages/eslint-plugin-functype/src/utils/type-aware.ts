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
  getResolvedSignature(node: unknown): SignatureLike | undefined
  getIndexInfoOfType(type: TypeLike, kind: number): { readonly type: TypeLike } | undefined
  getReturnTypeOfSignature(signature: unknown): TypeLike
  getAwaitedType(type: TypeLike): TypeLike | undefined
  isTupleType(type: TypeLike): boolean
  isTypeAssignableTo(source: TypeLike, target: TypeLike): boolean
  getPropertiesOfType(type: TypeLike): ReadonlyArray<{ readonly name: string }>
}

type SignatureLike = {
  readonly parameters: ReadonlyArray<unknown>
  getDeclaration(): { readonly parameters?: ReadonlyArray<unknown> } | undefined
}

/** `ts.TypeFlags.Any` / `Unknown`, inlined so the plugin needs no runtime `typescript` import. */
const ANY_OR_UNKNOWN_FLAGS = 1 | 2

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

/**
 * Is `node`'s type a functype `IO`? Structural: the type has both `runExit` and `provideLayer`, which
 * only `IO` carries — `Task`, `Lazy` and the other containers have neither — and has carried since
 * well before 1.9, so older functype versions are recognized too. A union of IOs counts.
 * `any` and `unknown` have no properties, so they don't.
 *
 * `undefined` when type information isn't available.
 */
export const isIOByType = (node: ASTNode, context: Rule.RuleContext): boolean | undefined => {
  const services = typedServices(context)
  if (!services) return undefined
  const tsNode = services.esTreeNodeToTSNodeMap.get(node)
  if (!tsNode) return undefined
  const checker = services.program.getTypeChecker()
  const type = checker.getNonNullableType(checker.getTypeAtLocation(tsNode))
  return (
    checker.getPropertyOfType(type, "runExit") !== undefined &&
    checker.getPropertyOfType(type, "provideLayer") !== undefined
  )
}

/**
 * Can `node`'s value carry a failure that dropping it would lose? Structural: the type, or a member of
 * its union, has `fold` and `isLeft` or `isFailure`. That covers Either, Try, Exit, Validation and
 * Either-shaped wrappers such as a `ServiceResult`, and leaves out Option and List, whose `None` or
 * empty value is no error. An `IO` is left to no-floating-io: it hasn't run, so it holds no failure yet.
 *
 * `undefined` when type information isn't available.
 */
export const canCarryFailureByType = (node: ASTNode, context: Rule.RuleContext): boolean | undefined => {
  const services = typedServices(context)
  if (!services) return undefined
  const tsNode = services.esTreeNodeToTSNodeMap.get(node)
  if (!tsNode) return undefined
  const checker = services.program.getTypeChecker()
  const type = checker.getNonNullableType(checker.getTypeAtLocation(tsNode))
  const has = (member: TypeLike, name: string): boolean => checker.getPropertyOfType(member, name) !== undefined
  const carries = (member: TypeLike): boolean =>
    has(member, "fold") && (has(member, "isLeft") || has(member, "isFailure")) && !has(member, "runExit")
  const members = (type as { readonly types?: ReadonlyArray<TypeLike> }).types ?? [type]
  return members.some(carries)
}

/** Where a functype container sits inside a value, and what it is called. */
export type ContainerAt = { readonly path: string; readonly name: string }

type TypeShape = {
  readonly types?: ReadonlyArray<TypeLike>
  readonly aliasSymbol?: SymbolShape
  isUnionOrIntersection?: () => boolean
  getSymbol?: () => SymbolShape | undefined
  getCallSignatures?: () => ReadonlyArray<unknown>
}
type SymbolShape = {
  readonly name: string
  getDeclarations?: () => ReadonlyArray<{ getSourceFile(): { readonly fileName: string } }> | undefined
}

const SERIALIZE_DEPTH = 4

/** A name to show for a container type: `Either`, `Option`, `List`, or the generic fallback. */
/** Member names TypeScript shows once a union loses its alias (`Either<E, A> | null`), mapped back. */
const MEMBER_TO_CONTAINER: Readonly<Record<string, string>> = { LeftOf: "Either", RightOf: "Either" }

const containerName = (type: TypeShape): string => {
  // A bundled .d.ts renames a clashing declaration `Map$1`.
  const raw = (type.aliasSymbol?.name ?? type.getSymbol?.()?.name)?.replace(/\$\d+$/, "")
  if (raw === undefined || raw.startsWith("__")) return "functype container"
  return MEMBER_TO_CONTAINER[raw] ?? raw
}

/** Declared in a dependency or the TypeScript lib: Stripe objects, Date, Request. Never descended into. */
const isFromDependency = (type: TypeShape): boolean => {
  // The type's own symbol, not its alias: `Partial<User>` and `Omit<Row, "x">` are anonymous mapped
  // types whose alias is declared in TypeScript's lib, and their properties are the caller's.
  const symbol = type.getSymbol?.()
  if (symbol === undefined || symbol.name.startsWith("__")) return false
  return (symbol.getDeclarations?.() ?? []).some((declaration) =>
    declaration.getSourceFile().fileName.includes("/node_modules/"),
  )
}

/**
 * The first functype container inside the value `node` evaluates to, and the path to it: `subscription`,
 * `items[]`, or empty for the whole value. A container is a type with `_tag` and `fold`, which every
 * functype container has and its `toJSON()` envelope doesn't. Walks unions, intersections, array and
 * tuple elements, object properties and string index signatures, up to 4 levels deep, and checks for a
 * container before skipping types declared in node_modules, where functype itself lives (#364).
 *
 * `undefined` when there is none, or when type information isn't available.
 */
export const containerInsideByType = (node: ASTNode, context: Rule.RuleContext): ContainerAt | undefined => {
  const services = typedServices(context)
  if (!services) return undefined
  const tsNode = services.esTreeNodeToTSNodeMap.get(node)
  if (!tsNode) return undefined
  const checker = services.program.getTypeChecker()
  const seen = new Set<TypeLike>()
  const isContainer = (type: TypeLike): boolean =>
    checker.getPropertyOfType(type, "_tag") !== undefined && checker.getPropertyOfType(type, "fold") !== undefined
  const at = (path: string, step: string): string =>
    path === "" ? step : step.startsWith("[") ? path + step : `${path}.${step}`

  const find = (type: TypeLike, path: string, depth: number): ContainerAt | undefined => {
    if (depth > SERIALIZE_DEPTH || seen.has(type) || isTypeParameter(type)) return undefined
    seen.add(type)
    const shape = type as TypeShape
    // Before splitting: an Either union has `_tag` and `fold` on every member, and `Stack` is an
    // intersection whose `_tag` and `fold` come from different members.
    if (isContainer(type)) return { path, name: containerName(shape) }
    if (shape.isUnionOrIntersection?.() === true) {
      return (shape.types ?? []).map((member) => find(member, path, depth)).find((h) => h !== undefined)
    }
    if ((shape.getCallSignatures?.() ?? []).length > 0) return undefined
    if (checker.isArrayLikeType(type) || checker.isTupleType(type)) {
      return checker
        .getTypeArguments(type)
        .map((element) => find(element, path === "" ? "[]" : `${path}[]`, depth + 1))
        .find((h) => h !== undefined)
    }
    // Before the dependency skip: `Record<string, Option<T>>` is declared in TypeScript's lib.
    const indexed = checker.getIndexInfoOfType(type, 0)?.type
    const byIndex = indexed === undefined ? undefined : find(indexed, at(path, "[key]"), depth + 1)
    if (byIndex !== undefined) return byIndex
    if (shape.getSymbol?.() === undefined || isFromDependency(shape)) return undefined
    return checker
      .getPropertiesOfType(type)
      .map((property) => find(checker.getTypeOfSymbolAtLocation(property, tsNode), at(path, property.name), depth + 1))
      .find((h) => h !== undefined)
  }

  return find(checker.getTypeAtLocation(tsNode), "", 0)
}

/** A slot's expected type and the expression TypeScript computed it for. */
type Slot = { readonly type: TypeLike; readonly at: ASTNode }

/**
 * Uses the `Type` object's own predicate rather than a `TypeFlags` bit: TypeScript renumbers its flags
 * between majors (TypeParameter is `1 << 19` in TS 6, `1 << 18` before), and the plugin has no runtime
 * `typescript` import to read them from.
 */
const isTypeParameter = (type: TypeLike): boolean =>
  (type as { isTypeParameter?: () => boolean }).isTypeParameter?.() === true

/**
 * `f(…, arg, …)` where `at` is `arg` or sits inside it (an object property, an array element, a spread,
 * a conditional branch, an `as`): the call, the whole argument, and its index.
 */
const enclosingCall = (
  at: ASTNode,
): { readonly call: ASTNode; readonly argument: ASTNode; readonly index: number } | null => {
  const parent = at.parent as ASTNode | undefined
  if (!parent) return null
  if ((parent.type === "CallExpression" || parent.type === "NewExpression") && parent.callee !== at) {
    const index = (parent.arguments as ReadonlyArray<ASTNode>).indexOf(at)
    return index < 0 ? null : { call: parent, argument: at, index }
  }
  const passesThrough =
    parent.type === "TSAsExpression" ||
    parent.type === "TSSatisfiesExpression" ||
    (parent.type === "ConditionalExpression" && parent.test !== at) ||
    parent.type === "LogicalExpression" ||
    parent.type === "Property" ||
    parent.type === "ObjectExpression" ||
    parent.type === "ArrayExpression" ||
    parent.type === "SpreadElement"
  return passesThrough ? enclosingCall(parent) : null
}

/**
 * Is the parameter that `at` is passed to (directly or nested) declared as a type parameter, or a union
 * containing one — `json<T>(data: T)`, `useState<S>(init: S | (() => S))`? Then TypeScript's expected type for `at` is only an echo of what it inferred from
 * `at` itself (`[1, 2]` → `number[]`), not a shape the library demands.
 */
const isGenericParameterArgument = (checker: CheckerLike, services: TypedServices, at: ASTNode): boolean => {
  const found = enclosingCall(at)
  const callTs = found ? services.esTreeNodeToTSNodeMap.get(found.call) : undefined
  const parameters = callTs ? checker.getResolvedSignature(callTs)?.getDeclaration()?.parameters : undefined
  if (!found || !parameters || parameters.length === 0) return false
  const declared = parameters[Math.min(found.index, parameters.length - 1)] as { readonly type?: unknown } | undefined
  // The parameter's type annotation node (`T` in `value: T`); asking for the declaration node's type gives `any`.
  if (declared?.type === undefined) return false
  const annotated = checker.getTypeAtLocation(declared.type)
  // React's `useState<S>(init: S | (() => S))`: a union that contains the type parameter is generic too.
  const members = (annotated as { types?: ReadonlyArray<TypeLike> }).types ?? [annotated]
  return members.some(isTypeParameter)
}

/**
 * Does the generic call around `at` hand the argument straight back to the caller — `useState(init)`
 * returning `[init, set]`, `identity(x)`, a `Promise` of it? Then the shape stays the caller's, and a
 * type parameter isn't a sink. Looks only at the return type itself, union / intersection members,
 * tuple and array elements, and an awaited Promise, not object properties: Hono's `c.json<T>` returns a
 * `Response` that carries a *parsed* copy of `T` for its RPC client, which the caller doesn't get back.
 */
const handsArgumentBack = (checker: CheckerLike, services: TypedServices, at: ASTNode): boolean => {
  const found = enclosingCall(at)
  const callTs = found ? services.esTreeNodeToTSNodeMap.get(found.call) : undefined
  const signature = callTs ? checker.getResolvedSignature(callTs) : undefined
  const argTs = found ? services.esTreeNodeToTSNodeMap.get(found.argument) : undefined
  if (!signature || !argTs) return false
  const argType = checker.getTypeAtLocation(argTs)
  const sameAsArgument = (candidate: TypeLike): boolean =>
    candidate === argType ||
    (checker.isTypeAssignableTo(argType, candidate) && checker.isTypeAssignableTo(candidate, argType))
  const search = (type: TypeLike, depth: number): boolean => {
    if (depth > 3) return false
    if (sameAsArgument(type)) return true
    const { types, target } = type as { types?: ReadonlyArray<TypeLike>; target?: unknown }
    if (types) return types.some((member) => search(member, depth + 1))
    if (target !== undefined && (checker.isTupleType(type) || checker.isArrayLikeType(type))) {
      return checker.getTypeArguments(type).some((element) => search(element, depth + 1))
    }
    const awaited = checker.getAwaitedType(type)
    return awaited !== undefined && awaited !== type && search(awaited, depth + 1)
  }
  return search(checker.getReturnTypeOfSignature(signature), 0)
}

/**
 * Untyped, or a type parameter of a call that doesn't hand the argument back: an object handed to
 * `c.json<T>(data: T)` or `JSON.stringify` goes to a sink. `useState<T>(init: T)` is not one.
 */
const isOpaqueSink = (checker: CheckerLike, services: TypedServices, slot: Slot): boolean =>
  isUntyped(slot.type) || (isTypeParameter(slot.type) && !handsArgumentBack(checker, services, slot.at))

const isArrayLikeOrUntyped = (checker: CheckerLike, services: TypedServices, slot: Slot): boolean => {
  if (isOpaqueSink(checker, services, slot)) return true
  const { types, symbol } = slot.type as { types?: ReadonlyArray<TypeLike>; symbol?: { name?: string } }
  if (types) return types.some((member) => isArrayLikeOrUntyped(checker, services, { type: member, at: slot.at }))
  if (symbol?.name !== undefined && CONSUMED_COLLECTION_TYPES.has(symbol.name)) return true
  return !isTypeParameter(slot.type) && checker.isArrayLikeType(slot.type)
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
const expectedSlot = (
  checker: CheckerLike,
  services: TypedServices,
  node: ASTNode,
  context: Rule.RuleContext,
  depth = 0,
): Slot | undefined => {
  if (depth > 4) return undefined
  const tsNode = services.esTreeNodeToTSNodeMap.get(node)
  const own = tsNode ? checker.getContextualType(tsNode) : undefined
  if (own !== undefined) return { type: own, at: node }
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
        .map((call) => expectedSlot(checker, services, call, context, depth + 1))
        .find((slot) => slot !== undefined)
    }
  }
  // An argument to an overloaded function (`crypto.subtle.importKey(…, ["decrypt"])`) gets no contextual
  // type; the parameter of the overload TypeScript picked is the expected type.
  if ((parent?.type === "CallExpression" || parent?.type === "NewExpression") && parent.callee !== node) {
    const index = (parent.arguments as ReadonlyArray<ASTNode>).indexOf(node)
    const call = services.esTreeNodeToTSNodeMap.get(parent)
    const parameter = index >= 0 && call ? checker.getResolvedSignature(call)?.parameters[index] : undefined
    return parameter === undefined ? undefined : { type: checker.getTypeOfSymbolAtLocation(parameter, call), at: node }
  }
  const objectLiteral = parent?.type === "Property" && parent.value === node ? (parent.parent as ASTNode) : undefined
  if (objectLiteral?.type !== "ObjectExpression") return undefined
  const outerSlot = expectedSlot(checker, services, objectLiteral, context, depth + 1)
  if (outerSlot === undefined || isOpaqueSink(checker, services, outerSlot)) return outerSlot
  const outer = outerSlot.type
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
    const type =
      named !== undefined
        ? checker.getTypeOfSymbolAtLocation(named, tsNode)
        : checker.getIndexInfoOfType(outer, 0)?.type
    return type === undefined ? undefined : { type, at: node }
  }
  const member = checker.getPropertyOfType(outer, key)
  return member === undefined ? undefined : { type: checker.getTypeOfSymbolAtLocation(member, tsNode), at: node }
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
  const slot = expectedSlot(checker, services, node, context)
  if (slot === undefined) return undefined
  // A bare `T` parameter: a sink unless the call hands the argument straight back (`useState`, `identity`).
  if (isGenericParameterArgument(checker, services, slot.at)) return !handsArgumentBack(checker, services, slot.at)
  return isArrayLikeOrUntyped(checker, services, slot)
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
  const slot = expectedSlot(checker, services, node, context)
  if (slot === undefined || isGenericParameterArgument(checker, services, slot.at)) return false
  return isMutableArrayType(checker, slot.type)
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

/** Is type-aware linting on for this file (`parserOptions.projectService` or `project`)? */
export const hasTypeInformation = (context: Rule.RuleContext): boolean => typedServices(context) !== undefined
