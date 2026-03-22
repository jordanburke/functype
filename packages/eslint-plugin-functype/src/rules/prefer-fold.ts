import type { Rule, SourceCode } from "eslint"

import type { ASTNode } from "../types/ast"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Prefer .fold() over if/else chains when working with monadic types",
      recommended: true,
    },
    fixable: "code",
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
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const minComplexity = options.minComplexity || 2

    function extractBodyForFold(node: ASTNode, sourceCode: SourceCode): string {
      if (node.type === "BlockStatement") {
        const statements = node.body
        if (statements.length === 1 && statements[0].type === "ReturnStatement") {
          // Extract just the return value, not the return statement
          return sourceCode.getText(statements[0].argument)
        } else {
          // For complex blocks, keep the full structure but remove outer braces
          return sourceCode.getText(node).slice(1, -1).trim()
        }
      } else {
        return sourceCode.getText(node)
      }
    }

    function replaceGetWithValue(body: string, monadicObj: string): string {
      // Replace monadicObj.get() with value, and monadicObj.get().chain with value.chain
      const escaped = monadicObj.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      return body.replace(new RegExp(`${escaped}\\.get\\(\\)`, "g"), "value")
    }

    function generateFoldFromIf(node: ASTNode): string | null {
      const sourceCode = context.sourceCode

      if (node.type !== "IfStatement") return null

      const test = node.test
      const consequent = node.consequent
      const alternate = node.alternate

      if (!consequent || !alternate) return null

      // Extract the monadic object from the test
      let monadicObj: string | null = null
      let isNegated = false

      // Handle patterns like option.isSome(), either.isLeft(), etc.
      if (test.type === "CallExpression" && test.callee.type === "MemberExpression") {
        const methodName = test.callee.property.name
        monadicObj = sourceCode.getText(test.callee.object)

        if (methodName === "isSome" || methodName === "isRight" || methodName === "isSuccess") {
          isNegated = false
        } else if (
          methodName === "isNone" ||
          methodName === "isEmpty" ||
          methodName === "isLeft" ||
          methodName === "isFailure"
        ) {
          isNegated = true
        }
      }

      if (!monadicObj) return null

      // Only handle simple cases - single return statements in blocks, no nested if statements
      if (consequent.type === "BlockStatement") {
        if (consequent.body.length !== 1 || consequent.body[0].type !== "ReturnStatement") {
          return null // Too complex, don't auto-fix
        }
      }

      if (alternate.type === "BlockStatement") {
        if (alternate.body.length !== 1 || alternate.body[0].type !== "ReturnStatement") {
          return null // Too complex, don't auto-fix
        }
      } else if (alternate.type === "IfStatement") {
        return null // Nested if/else is too complex for simple fold pattern
      }

      // Extract consequent and alternate bodies
      const thenBody = extractBodyForFold(consequent, sourceCode)
      const elseBody = extractBodyForFold(alternate, sourceCode)

      // Generate fold expression — replace .get() calls with value parameter
      if (isNegated) {
        // isNone/isLeft/isFailure: consequent is the "none" branch, alternate is the "some" branch
        const successBody = replaceGetWithValue(elseBody, monadicObj)
        return `${monadicObj}.fold(() => ${thenBody}, (value) => ${successBody})`
      } else {
        // isSome/isRight/isSuccess: consequent is the "some" branch, alternate is the "none" branch
        const successBody = replaceGetWithValue(thenBody, monadicObj)
        return `${monadicObj}.fold(() => ${elseBody}, (value) => ${successBody})`
      }
    }

    function generateFoldFromTernary(node: ASTNode): string | null {
      const sourceCode = context.sourceCode

      if (node.type !== "ConditionalExpression") return null

      const test = node.test
      const consequent = node.consequent
      const alternate = node.alternate

      // Extract the monadic object from the test
      let monadicObj: string | null = null
      let isNegated = false

      if (test.type === "CallExpression" && test.callee.type === "MemberExpression") {
        const methodName = test.callee.property.name
        monadicObj = sourceCode.getText(test.callee.object)

        if (methodName === "isSome" || methodName === "isRight" || methodName === "isSuccess") {
          isNegated = false
        } else if (
          methodName === "isNone" ||
          methodName === "isEmpty" ||
          methodName === "isLeft" ||
          methodName === "isFailure"
        ) {
          isNegated = true
        }
      }

      if (!monadicObj) return null

      const thenExpr = sourceCode.getText(consequent)
      const elseExpr = sourceCode.getText(alternate)

      // Generate fold expression — replace .get() calls with value parameter
      if (isNegated) {
        const successExpr = replaceGetWithValue(elseExpr, monadicObj)
        return `${monadicObj}.fold(() => ${thenExpr}, (value) => ${successExpr})`
      } else {
        const successExpr = replaceGetWithValue(thenExpr, monadicObj)
        return `${monadicObj}.fold(() => ${elseExpr}, (value) => ${successExpr})`
      }
    }

    function shouldAutoFix(node: ASTNode): boolean {
      // Only auto-fix when we detect functype method calls (indicating it's already a functype instance)
      if (node.type === "CallExpression" && node.callee.type === "MemberExpression") {
        const methodName = node.callee.property.name
        // These methods indicate the object is already a functype instance
        return ["isSome", "isNone", "isEmpty", "isRight", "isLeft", "isSuccess", "isFailure"].includes(methodName)
      }
      return false
    }

    function isMonadicCheck(node: ASTNode): { isMonadic: boolean; type: string } {
      const sourceCode = context.sourceCode
      const text = sourceCode.getText(node)

      // Check for common monadic type checks
      if (/\.(isSome|isNone|isEmpty|isDefined)\s*\(\s*\)/.test(text)) {
        return { isMonadic: true, type: "Option" }
      }

      if (/\.(isLeft|isRight)\s*\(\s*\)/.test(text)) {
        return { isMonadic: true, type: "Either" }
      }

      if (/\.(isSuccess|isFailure)\s*\(\s*\)/.test(text)) {
        return { isMonadic: true, type: "Result" }
      }

      // Check for null/undefined checks on variables that might be Options
      if (node.type === "BinaryExpression") {
        if (
          (node.operator === "===" || node.operator === "!==" || node.operator === "==" || node.operator === "!=") &&
          ((node.left.type === "Literal" && (node.left.value === null || node.left.value === undefined)) ||
            (node.right.type === "Literal" && (node.right.value === null || node.right.value === undefined)))
        ) {
          return { isMonadic: true, type: "Option" }
        }

        // Check for === or == with undefined identifier
        if (node.operator === "==" || node.operator === "!=" || node.operator === "===" || node.operator === "!==") {
          const leftIsUndefined = node.left.type === "Identifier" && node.left.name === "undefined"
          const rightIsUndefined = node.right.type === "Identifier" && node.right.name === "undefined"

          if (leftIsUndefined || rightIsUndefined) {
            return { isMonadic: true, type: "Option" }
          }
        }
      }

      return { isMonadic: false, type: "" }
    }

    function analyzeIfStatement(node: ASTNode) {
      const test = node.test
      const monadicInfo = isMonadicCheck(test)

      if (!monadicInfo.isMonadic) return

      // Don't analyze if this is part of a larger if/else chain
      // (only analyze the outermost if statement)
      if (node.parent && node.parent.type === "IfStatement") return

      // Count the complexity (if/else if/else chain)
      let complexity = 1
      let current = node
      while (current.alternate) {
        complexity++
        if (current.alternate.type === "IfStatement") {
          current = current.alternate
        } else {
          break
        }
      }

      if (complexity >= minComplexity) {
        context.report({
          node,
          messageId: "preferFold",
          data: { type: monadicInfo.type },
          fix(fixer) {
            // Only auto-fix if we can detect it's already a functype instance
            if (!shouldAutoFix(node.test)) {
              return null
            }
            const replacement = generateFoldFromIf(node)
            if (replacement) {
              return fixer.replaceText(node, replacement)
            }
            return null
          },
        })
      }
    }

    return {
      IfStatement(node: ASTNode) {
        analyzeIfStatement(node)
      },

      ConditionalExpression(node: ASTNode) {
        const monadicInfo = isMonadicCheck(node.test)
        if (monadicInfo.isMonadic) {
          context.report({
            node,
            messageId: "preferFoldTernary",
            data: { type: monadicInfo.type },
            fix(fixer) {
              // Only auto-fix if we can detect it's already a functype instance
              if (!shouldAutoFix(node.test)) {
                return null
              }
              const replacement = generateFoldFromTernary(node)
              if (replacement) {
                return fixer.replaceText(node, replacement)
              }
              return null
            },
          })
        }
      },
    }
  },
}

export default rule
