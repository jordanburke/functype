import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/no-let"

describe("no-let", () => {
  ruleTester.run("no-let", rule, {
    valid: [
      {
        name: "const is allowed",
        code: "const x = 1",
      },
      {
        name: "const destructuring is allowed",
        code: "const { a, b } = obj",
      },
      {
        name: "for-of with const is allowed",
        code: "for (const item of items) { console.log(item) }",
      },
    ],
    invalid: [
      {
        name: "let without reassignment should autofix to const",
        code: "let x = 1",
        errors: [{ messageId: "noLet" }],
        output: "const x = 1",
      },
      {
        name: "let with reassignment should warn without autofix",
        code: "let x = 1; x = 2",
        errors: [{ messageId: "noLet", suggestions: [{ messageId: "suggestConst", output: "const x = 1; x = 2" }] }],
        output: null,
      },
      {
        name: "let declared then assigned should warn without autofix",
        code: "let x; x = getValue()",
        errors: [
          { messageId: "noLet", suggestions: [{ messageId: "suggestConst", output: "const x; x = getValue()" }] },
        ],
        output: null,
      },
      {
        name: "let with multiple declarators without reassignment should autofix",
        code: "let x = 1, y = 2",
        errors: [{ messageId: "noLet" }],
        output: "const x = 1, y = 2",
      },
      {
        name: "for loop with increment should warn without autofix",
        code: "for (let i = 0; i < 10; i++) { console.log(i) }",
        errors: [
          {
            messageId: "noLet",
            suggestions: [{ messageId: "suggestConst", output: "for (const i = 0; i < 10; i++) { console.log(i) }" }],
          },
        ],
        output: null,
      },
    ],
  })
})
