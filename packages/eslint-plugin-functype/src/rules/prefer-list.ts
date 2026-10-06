import type { Rule } from "eslint"

import type { ASTNode } from "../types/ast"
import { getFunctypeImportsLegacy, isFunctypeCall } from "../utils/functype-detection"
import { createImportFixer, hasFunctypeSymbol } from "../utils/import-fixer"
import { flowsIntoArraySlot, flowsIntoMutableArraySlot, isUntypedExpression } from "../utils/type-aware"
import { DEFAULT_WIRE_TYPES, isInsideWireType, WIRE_TYPES_SCHEMA } from "../utils/wire-types"

/** AST keys that don't represent syntax children — back-edges and source metadata. */
const NON_CHILD_KEYS: ReadonlySet<string> = new Set(["parent", "loc", "range"])

/** AST children of `node`: drops back-edges, flattens array-valued keys, filters non-object leaves. */
function astChildren(node: ASTNode): readonly unknown[] {
  return Object.entries(node)
    .filter(([k]) => !NON_CHILD_KEYS.has(k))
    .flatMap(([, v]) => (Array.isArray(v) ? v : [v]))
    .filter((v) => v !== null && typeof v === "object")
}

/** True iff any ancestor of `node` satisfies `pred`. Pure tail recursion. */
function ancestorSatisfies(node: ASTNode | null | undefined, pred: (n: ASTNode) => boolean): boolean {
  const parent = node?.parent as ASTNode | undefined
  if (!parent) return false
  return pred(parent) || ancestorSatisfies(parent, pred)
}

/** `parent` is `List.from(arr)` or `List.of(...arr)`. */
function isListFactoryArg(parent: ASTNode | null | undefined): boolean {
  return (
    parent?.type === "CallExpression" &&
    parent.callee.type === "MemberExpression" &&
    parent.callee.object.type === "Identifier" &&
    parent.callee.object.name === "List" &&
    ["from", "of"].includes(parent.callee.property.name)
  )
}

/**
 * `[…] as const` or `[…] as [string, ...string[]]`: the literal is asserted to a tuple, a fixed shape that
 * `List` can't express (an enum's values, the argument zod's `z.enum` requires).
 */
function isTupleAssertion(parent: ASTNode | null | undefined): boolean {
  const raw = parent?.type === "TSAsExpression" ? parent.typeAnnotation : undefined
  const annotation = raw?.type === "TSTypeOperator" ? raw.typeAnnotation : raw
  if (annotation?.type === "TSTupleType") return true
  return (
    annotation?.type === "TSTypeReference" &&
    annotation.typeName?.type === "Identifier" &&
    annotation.typeName.name === "const"
  )
}

/** Array methods that change the array in place. */
const MUTATING_METHODS: ReadonlySet<string> = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
  "fill",
  "copyWithin",
])

/** `[…].join(" ")`, `[a, b].includes(x)`, `[...x].sort(…)`: a literal whose method is called on the spot. */
function isTransientReceiver(node: ASTNode, parent: ASTNode | null | undefined): boolean {
  return parent?.type === "MemberExpression" && parent.object === node && parent.parent?.type === "CallExpression"
}

/**
 * Is `node` spread straight into a call's arguments, `and(...conds)` or `and(...(c ? [x] : []))`?
 * The function receives the elements one by one; the array is never a collection of your own.
 */
function isSpreadIntoCall(node: ASTNode): boolean {
  const parent = node.parent as ASTNode | undefined
  if (!parent) return false
  if (parent.type === "ConditionalExpression" && parent.test !== node) return isSpreadIntoCall(parent)
  if (parent.type === "LogicalExpression" && parent.right === node) return isSpreadIntoCall(parent)
  return (
    parent.type === "SpreadElement" &&
    (parent.parent?.type === "CallExpression" || parent.parent?.type === "NewExpression")
  )
}

/** The `x` in `const x: T[] = …` or `(x: T[]) => …`, when the array type is (part of) its annotation. */
function annotatedBinding(typeNode: ASTNode): ASTNode | null {
  const climb = (n: ASTNode | null | undefined): ASTNode | null => {
    if (!n) return null
    if (n.type === "TSTypeAnnotation") return n.parent?.type === "Identifier" ? (n.parent as ASTNode) : null
    if (n.type === "TSAsExpression" || n.type === "TSSatisfiesExpression" || n.type.endsWith("Statement")) return null
    return climb(n.parent as ASTNode | undefined)
  }
  return climb(typeNode.parent as ASTNode | undefined)
}

/**
 * The name of the function whose declared return type *is* this array type: `f` in
 * `function f(): T[]` or `const f = (): T[] => …`. Null for anything nested (`(): { nodes: T[] }`).
 */
function returningFunctionName(typeNode: ASTNode): ASTNode | null {
  const annotation = typeNode.parent as ASTNode | undefined
  const fn = annotation?.type === "TSTypeAnnotation" ? (annotation.parent as ASTNode | undefined) : undefined
  if (!fn || fn.returnType !== annotation) return null
  if (fn.type === "FunctionDeclaration") return fn.id?.type === "Identifier" ? (fn.id as ASTNode) : null
  const declarator = fn.parent as ASTNode | undefined
  return (fn.type === "ArrowFunctionExpression" || fn.type === "FunctionExpression") &&
    declarator?.type === "VariableDeclarator" &&
    declarator.init === fn &&
    declarator.id?.type === "Identifier"
    ? (declarator.id as ASTNode)
    : null
}

/** The property name when the array type annotates a field: `errors` in `{ errors: string[] }` or `class { errors: T[] }`. */
function annotatedFieldName(typeNode: ASTNode): string | null {
  const annotation = typeNode.parent as ASTNode | undefined
  const field = annotation?.type === "TSTypeAnnotation" ? (annotation.parent as ASTNode | undefined) : undefined
  if (field?.type !== "TSPropertySignature" && field?.type !== "PropertyDefinition") return null
  return field.key?.type === "Identifier" && !field.computed ? field.key.name : null
}

/** The outermost `x as … as T[]` around an array type used as a cast target, or null. */
function castOf(typeNode: ASTNode): ASTNode | null {
  const climb = (n: ASTNode | null | undefined, child: ASTNode): ASTNode | null => {
    if (!n || n.type === "TSTypeAnnotation" || n.type.endsWith("Statement")) return null
    if (n.type === "TSAsExpression" && n.typeAnnotation === child) {
      const outer = (current: ASTNode): ASTNode =>
        current.parent?.type === "TSAsExpression" ? outer(current.parent as ASTNode) : current
      return outer(n)
    }
    return climb(n.parent as ASTNode | undefined, n)
  }
  return climb(typeNode.parent as ASTNode | undefined, typeNode)
}

/** `node` is a VariableDeclarator with its own type annotation, or a TSTypeAnnotation node directly. */
function hasOwnTypeAnnotation(node: ASTNode): boolean {
  return (node.type === "VariableDeclarator" && Boolean(node.id?.typeAnnotation)) || node.type === "TSTypeAnnotation"
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    hasSuggestions: true,
    docs: {
      description: "Prefer List<T> over native arrays for immutable collections",
      recommended: true,
    },
    schema: [
      {
        type: "object",
        properties: {
          allowArraysInTests: {
            type: "boolean",
            default: true,
          },
          wireTypes: WIRE_TYPES_SCHEMA,
          allowReadonlyArrays: {
            type: "boolean",
            default: true,
          },
          allowArrayLiterals: {
            type: "boolean",
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      preferList: "Prefer List<{{type}}> over array type {{arrayType}}",
      preferReadonlyOrList:
        "Mutable array type {{arrayType}}: use ReadonlyArray<{{type}}> where it crosses a boundary, or List<{{type}}> inside your own code",
      preferWireCast:
        "Cast to the mutable array {{arrayType}}: this is data decoded from outside. Declare its shape once as Wire<ReadonlyArray<{{type}}>> (functype's boundary marker) and cast to that",
      mutatedArray:
        "{{name}} is a mutable array changed in place (.{{how}}()). Build it without mutation instead: map/filter/flatMap, a List, or a fold",
      preferListLiteral: "Prefer List.of(...) or List.from([...]) over array literal",
      suggestListType: "Replace with List<{{type}}>",
      suggestReadonlyArray: "Replace with ReadonlyArray<{{type}}>",
      suggestListOf: "Replace with List.of(...)",
      suggestAddImport: "Add {{symbol}} import from functype",
    },
  },

  create(context) {
    const options = context.options[0] || {}
    // Everything inside `Wire<…>` is the declared serialization shape (#325 B).
    const wireTypes: ReadonlyArray<string> = options.wireTypes ?? DEFAULT_WIRE_TYPES
    const allowArraysInTests = options.allowArraysInTests !== false
    const allowReadonlyArrays = options.allowReadonlyArrays !== false
    const allowArrayLiterals = options.allowArrayLiterals === true

    // Get functype imports if available (but still apply rule even without explicit import)
    const functypeImports = getFunctypeImportsLegacy(context)

    function isInTestFile() {
      const filename = context.filename
      return (
        /\.(test|spec)\.(ts|js|tsx|jsx)$/.test(filename) ||
        filename.includes("__tests__") ||
        filename.includes("/test/") ||
        filename.includes("/tests/")
      )
    }

    function findTypeParameter(node: ASTNode, sourceCode: typeof context.sourceCode): string | null {
      // Pure pre-order search: look at this node, then recursively at each
      // child until we find a TSTypeParameterInstantiation with a first param.
      function findInNode(n: ASTNode): string | null {
        if (n.type === "TSTypeParameterInstantiation" && n.params && n.params[0]) {
          return sourceCode.getText(n.params[0])
        }
        const results = astChildren(n)
          .filter((c): c is ASTNode => typeof (c as ASTNode)?.type === "string")
          .map((child) => findInNode(child))
        return results.find((r) => r !== null) ?? null
      }
      return findInNode(node)
    }

    /** `List([...x])`, `Set([a, b])`: the literal is already being captured into a functype value. */
    function isFunctypeConstructorArg(node: ASTNode, parent: ASTNode | null | undefined): boolean {
      return (
        parent?.type === "CallExpression" &&
        parent.callee.type === "Identifier" &&
        functypeImports.has(parent.callee.name) &&
        parent.arguments.includes(node)
      )
    }

    /** Is `node` handed straight to an array-typed slot, directly or spread into a literal that is? */
    function reachesArraySlot(node: ASTNode): boolean {
      if (flowsIntoArraySlot(node, context) === true) return true
      if (isSpreadIntoCall(node)) return true
      const parent = node.parent as ASTNode | undefined
      return (
        parent?.type === "SpreadElement" &&
        parent.parent?.type === "ArrayExpression" &&
        flowsIntoArraySlot(parent.parent as ASTNode, context) === true
      )
    }

    /** `lines.join("\n")`: a non-mutating method called on the spot. */
    function isReadOnlyMethodReceiver(identifier: ASTNode): boolean {
      const member = identifier.parent as ASTNode | undefined
      if (member?.type !== "MemberExpression" || member.object !== identifier || member.computed) return false
      const name = member.property?.type === "Identifier" ? member.property.name : null
      const call = member.parent as ASTNode | undefined
      return name !== null && !MUTATING_METHODS.has(name) && call?.type === "CallExpression" && call.callee === member
    }

    /**
     * `const OPTIONS = [...]` whose every use hands it to an array-typed slot (`<Select data={OPTIONS} />`,
     * `db.insert(t).values(ROWS)`) or calls a read-only method on it (`lines.join("\n")`): data built to give
     * to a library, or a temporary, declared before it's used. Needs at least one local use; an exported
     * constant with no local use is still reported, because its consumers aren't visible here.
     */
    function isOnlyHandedToArraySlots(declarator: ASTNode | null | undefined): boolean {
      if (declarator?.type !== "VariableDeclarator" || declarator.id?.type !== "Identifier") return false
      const uses = context.sourceCode
        .getDeclaredVariables(declarator)
        .flatMap((variable) => variable.references.filter((ref) => !ref.init))
      return (
        uses.length > 0 &&
        uses.every(
          (ref) => reachesArraySlot(ref.identifier as ASTNode) || isReadOnlyMethodReceiver(ref.identifier as ASTNode),
        )
      )
    }

    /** References to `binding` other than its declaration. */
    function usesOf(binding: ASTNode): ReadonlyArray<{ identifier: ASTNode }> {
      // The declaring node: a VariableDeclarator, a FunctionDeclaration (its name lives in the outer
      // scope) or, for a parameter, its function. getDeclaredVariables on it yields the binding.
      const owner = (binding.parent as ASTNode | undefined) ?? binding
      const variable =
        context.sourceCode.getDeclaredVariables(owner).find((v) => v.name === binding.name) ??
        context.sourceCode.getScope(binding).set.get(binding.name)
      return (variable?.references ?? [])
        .filter((ref) => !ref.init && ref.identifier !== binding)
        .map((ref) => ({ identifier: ref.identifier as ASTNode }))
    }

    /** The in-place mutation applied to `binding` (`push`, `sort`, `x[i] = …`), if any. */
    function mutationOf(binding: ASTNode): string | null {
      const found = usesOf(binding)
        .map(({ identifier }) => {
          const parent = identifier.parent as ASTNode | undefined
          if (parent?.type !== "MemberExpression" || parent.object !== identifier) return null
          const grand = parent.parent as ASTNode | undefined
          if (grand?.type === "AssignmentExpression" && grand.left === parent) return "[index] ="
          const name = parent.property?.type === "Identifier" && !parent.computed ? parent.property.name : null
          return name && MUTATING_METHODS.has(name) && grand?.type === "CallExpression" && grand.callee === parent
            ? name
            : null
        })
        .find((how) => how !== null)
      return found ?? null
    }

    /** The first in-place mutation of `.<field>` anywhere in the file (`x.errors.push(…)`), or null. */
    function fieldMutationIn(field: string): string | null {
      const pattern = new RegExp(
        `\\.${field.replace(/\$/g, "\\$")}\\s*\\.\\s*(${[...MUTATING_METHODS].join("|")})\\s*\\(`,
      )
      const match = pattern.exec(context.sourceCode.text)
      return match ? (match[1] ?? null) : null
    }

    /** Is `binding` handed to a slot that requires a mutable array (pg `query` values, ReactFlow `nodes`)? */
    function feedsMutableSlot(binding: ASTNode): boolean {
      return usesOf(binding).some(({ identifier }) => flowsIntoMutableArraySlot(identifier, context) === true)
    }

    /**
     * Report a mutable array type, unless a library demands it. The order matters: a library slot that
     * requires `T[]` makes the type correct as written; a binding mutated in place can't take
     * `ReadonlyArray` without a rewrite, so it gets advice instead of a suggestion that wouldn't compile;
     * a cast is decoded outside data, so it points at `Wire`.
     */
    function checkMutable(reportNode: ASTNode, elementType: string, fullType: string): void {
      const cast = castOf(reportNode)
      // The value under every `as`: `JSON.parse(raw)` in `JSON.parse(raw) as unknown as T[]`.
      const castSource = (n: ASTNode): ASTNode =>
        n.type === "TSAsExpression" ? castSource(n.expression as ASTNode) : n
      if (cast && flowsIntoMutableArraySlot(cast, context) === true) return
      // Only a cast of an untyped value (`JSON.parse`, `res.json()`, a raw row) is decoding outside data,
      // the Wire case. Without type information, any cast that isn't of a literal counts.
      const source = cast ? castSource(cast) : null
      const decodes =
        source !== null && source.type !== "ArrayExpression" && isUntypedExpression(source, context) !== false
      if (cast && decodes) {
        context.report({
          node: reportNode,
          messageId: "preferWireCast",
          data: { type: elementType, arrayType: fullType },
          suggest: [
            {
              messageId: "suggestReadonlyArray",
              data: { type: elementType },
              fix: (fixer: Rule.RuleFixer) => fixer.replaceText(reportNode, `ReadonlyArray<${elementType}>`),
            },
          ],
        })
        return
      }
      // `function allowedTools(): string[]` whose result goes to an SDK option typed `string[]`.
      const fnName = returningFunctionName(reportNode)
      const feedsFromCall =
        fnName !== null &&
        usesOf(fnName).some(({ identifier }) => {
          const call = identifier.parent as ASTNode | undefined
          return (
            call?.type === "CallExpression" &&
            call.callee === identifier &&
            flowsIntoMutableArraySlot(call, context) === true
          )
        })
      if (feedsFromCall) return
      // A field mutated somewhere in the file (`result.errors.push(e)`, `this.events.push(e)`): a
      // ReadonlyArray suggestion wouldn't compile, so give the mutation advice. Matched by name, which only
      // picks the message, never whether to report.
      const field = annotatedFieldName(reportNode)
      const fieldMutation = field === null ? null : fieldMutationIn(field)
      if (field !== null && fieldMutation !== null) {
        context.report({ node: reportNode, messageId: "mutatedArray", data: { name: field, how: fieldMutation } })
        return
      }
      const binding = annotatedBinding(reportNode)
      if (binding) {
        if (feedsMutableSlot(binding)) return
        const how = mutationOf(binding)
        if (how) {
          context.report({ node: reportNode, messageId: "mutatedArray", data: { name: binding.name, how } })
          return
        }
      }
      reportMutable(reportNode, elementType, fullType)
    }

    /**
     * A mutable `T[]` / `Array<T>` is the real defect: anything holding it can push, sort or splice.
     * `ReadonlyArray<T>` fixes that and still fits wherever a library expects an array, so it's offered
     * first; `List<T>` is for collections that live inside your own code.
     */
    function reportMutable(reportNode: ASTNode, elementType: string, fullType: string): void {
      const sourceCode = context.sourceCode
      const suggest: Rule.SuggestionReportDescriptor[] = [
        {
          messageId: "suggestReadonlyArray",
          data: { type: elementType },
          fix: (fixer: Rule.RuleFixer) => fixer.replaceText(reportNode, `ReadonlyArray<${elementType}>`),
        },
        {
          messageId: "suggestListType",
          data: { type: elementType },
          fix: (fixer: Rule.RuleFixer) => fixer.replaceText(reportNode, `List<${elementType}>`),
        },
      ]
      if (!hasFunctypeSymbol(sourceCode, "List")) {
        suggest.push({
          messageId: "suggestAddImport",
          data: { symbol: "List" },
          fix: createImportFixer(sourceCode, "List"),
        })
      }
      context.report({
        node: reportNode,
        messageId: "preferReadonlyOrList",
        data: { type: elementType, arrayType: fullType },
        suggest,
      })
    }

    return {
      TSArrayType(node: ASTNode) {
        if (isInsideWireType(node, wireTypes)) return
        if (allowArraysInTests && isInTestFile()) return

        // `readonly T[]` parses as TSTypeOperator(operator: "readonly") wrapping TSArrayType.
        // When the parent is that readonly wrapper, we treat the whole `readonly T[]` as
        // the reported unit — both for gating (parity with the ReadonlyArray<T> branch
        // below) and for the suggestion's replacement range. Replacing only the inner
        // TSArrayType would leave `readonly List<T>` behind, which is invalid TS
        // (TS1354: `readonly` only applies to array/tuple types).
        const parent = node.parent as ASTNode | undefined
        // `[string, ...string[]]`: a tuple's rest element must be written as an array type, and libraries
        // such as zod's `z.enum` require exactly that shape. The tuple is the type; its rest isn't a list.
        if (parent?.type === "TSRestType") return

        const isReadonly =
          parent?.type === "TSTypeOperator" && (parent as { operator?: string }).operator === "readonly"

        if (isReadonly && allowReadonlyArrays) return

        const sourceCode = context.sourceCode
        const elementType = sourceCode.getText(node.elementType)
        const reportNode = isReadonly ? (parent as ASTNode) : node
        const fullType = sourceCode.getText(reportNode)

        if (!isReadonly) {
          checkMutable(reportNode, elementType, fullType)
          return
        }

        const suggest: Rule.SuggestionReportDescriptor[] = [
          {
            messageId: "suggestListType",
            data: { type: elementType },
            fix(fixer: Rule.RuleFixer) {
              return fixer.replaceText(reportNode, `List<${elementType}>`)
            },
          },
        ]

        if (!hasFunctypeSymbol(sourceCode, "List")) {
          suggest.push({
            messageId: "suggestAddImport",
            data: { symbol: "List" },
            fix: createImportFixer(sourceCode, "List"),
          })
        }

        context.report({
          node: reportNode,
          messageId: "preferList",
          data: {
            type: elementType,
            arrayType: fullType,
          },
          suggest,
        })
      },

      TSTypeReference(node: ASTNode) {
        if (isInsideWireType(node, wireTypes)) return
        if (allowArraysInTests && isInTestFile()) return

        const sourceCode = context.sourceCode

        // Get type name - handle both simple identifiers and member expressions
        if (!node.typeName) return // No type name found

        const typeName = node.typeName.type === "Identifier" ? node.typeName.name : sourceCode.getText(node.typeName)

        // Handle Array<T> syntax: mutable, same as T[]
        if (typeName === "Array") {
          const typeParam = findTypeParameter(node, sourceCode)
          checkMutable(node, typeParam || "T", sourceCode.getText(node))
          return
        }

        // Handle ReadonlyArray<T> — gated on allowReadonlyArrays (parity with `readonly T[]`).
        if (typeName === "ReadonlyArray") {
          if (allowReadonlyArrays) return

          const typeParam = findTypeParameter(node, sourceCode)
          const fullType = sourceCode.getText(node)
          const resolvedType = typeParam || "T"

          const suggest: Rule.SuggestionReportDescriptor[] = [
            {
              messageId: "suggestListType",
              data: { type: resolvedType },
              fix(fixer: Rule.RuleFixer) {
                return fixer.replaceText(node, `List<${resolvedType}>`)
              },
            },
          ]

          if (!hasFunctypeSymbol(sourceCode, "List")) {
            suggest.push({
              messageId: "suggestAddImport",
              data: { symbol: "List" },
              fix: createImportFixer(sourceCode, "List"),
            })
          }

          context.report({
            node,
            messageId: "preferList",
            data: {
              type: resolvedType,
              arrayType: fullType,
            },
            suggest,
          })
        }
      },

      ArrayExpression(node: ASTNode) {
        if (allowArraysInTests && isInTestFile()) return
        if (allowArrayLiterals) return

        // Only flag non-empty arrays to avoid noise
        if (node.elements.length === 0) return

        const parent = node.parent

        // Don't flag arrays that are already arguments to functype calls.
        if (parent && isFunctypeCall(parent, functypeImports)) return

        // Don't flag arrays that are arguments to List.from / List.of.
        if (isListFactoryArg(parent)) return

        // Don't flag nested array literals — let the outermost one handle it.
        if (ancestorSatisfies(node, (n) => n.type === "ArrayExpression")) return

        // Don't flag array literals that already live in a type-annotated
        // context (those are handled by the type-checking rules).
        if (ancestorSatisfies(node, hasOwnTypeAnnotation)) return

        // A literal asserted to a tuple (`as const`, `as [string, ...string[]]`) is a fixed shape.
        if (isTupleAssertion(parent)) return

        // With type information: a literal passed where an array is expected — drizzle's
        // `.values([...])`, an index definition, a schema `target: [...]` — is handed straight to code
        // that requires an array. It never becomes a collection in your own code, so it's the
        // boundary itself and `List` can't go there.
        if (flowsIntoArraySlot(node, context) === true) return
        if (isFunctypeConstructorArg(node, parent)) return
        // Used on the spot (`[a, b].includes(x)`, `[...].join("\n")`, `[...x].sort(…)`): nothing is stored.
        if (isTransientReceiver(node, parent)) return
        // Spread into a call (`and(...(c ? [x] : []))`): the function gets the elements one by one.
        if (isSpreadIntoCall(node)) return
        // `const acc = [...]; acc.push(x)`: an accumulator. The defect is the mutation, so it gets the same
        // advice as a mutated `T[]` binding, not a List.of suggestion that has no push.
        if (parent?.type === "VariableDeclarator" && parent.id?.type === "Identifier") {
          const how = mutationOf(parent.id as ASTNode)
          if (how) {
            context.report({ node, messageId: "mutatedArray", data: { name: parent.id.name, how } })
            return
          }
        }
        if (isOnlyHandedToArraySlots(parent)) return

        // Check if any element is a SpreadElement — ambiguous semantics, skip suggestions
        const hasSpread = node.elements.some((el) => el !== null && el.type === "SpreadElement")

        if (hasSpread) {
          context.report({
            node,
            messageId: "preferListLiteral",
          })
          return
        }

        const sourceCode = context.sourceCode
        const elementTexts = node.elements.filter((el) => el !== null).map((el) => sourceCode.getText(el))

        const suggest: Rule.SuggestionReportDescriptor[] = [
          {
            messageId: "suggestListOf",
            fix(fixer: Rule.RuleFixer) {
              return fixer.replaceText(node, `List.of(${elementTexts.join(", ")})`)
            },
          },
        ]

        if (!hasFunctypeSymbol(sourceCode, "List")) {
          suggest.push({
            messageId: "suggestAddImport",
            data: { symbol: "List" },
            fix: createImportFixer(sourceCode, "List"),
          })
        }

        context.report({
          node,
          messageId: "preferListLiteral",
          suggest,
        })
      },
    }
  },
}

export default rule
