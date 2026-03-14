import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/no-imperative-loops"

describe("no-imperative-loops", () => {
  ruleTester.run("no-imperative-loops", rule, {
    valid: [
      // Using functional methods
      {
        name: "Using forEach is preferred",
        code: "items.forEach(item => console.log(item))",
      },
      {
        name: "Using map is preferred",
        code: "const doubled = numbers.map(n => n * 2)",
      },
      {
        name: "Using filter is preferred",
        code: "const evens = numbers.filter(n => n % 2 === 0)",
      },
      {
        name: "Using reduce is preferred",
        code: "const sum = numbers.reduce((acc, n) => acc + n, 0)",
      },
      // Non-loop statements
      {
        name: "Non-loop statements are allowed",
        code: `
          function processData(data: string) {
            return data.toUpperCase()
          }
        `,
      },
    ],
    invalid: [
      // Basic for loop
      {
        name: "For loop should use functional methods",
        code: `
          for (let i = 0; i < items.length; i++) {
            console.log(items[i])
          }
        `,
        errors: [
          {
            messageId: "noForLoop",
          },
        ],
      },
      // For...in loop
      {
        name: "For...in loop should use functional methods",
        code: `
          for (const key in obj) {
            console.log(obj[key])
          }
        `,
        errors: [
          {
            messageId: "noForInLoop",
          },
        ],
      },
      // For...of loop
      {
        name: "For...of loop should use functional methods",
        code: `
          for (const item of items) {
            console.log(item)
          }
        `,
        errors: [
          {
            messageId: "noForOfLoop",
          },
        ],
      },
      // While loop
      {
        name: "While loop should use functional methods",
        code: `
          let i = 0
          while (i < items.length) {
            console.log(items[i])
            i++
          }
        `,
        errors: [
          {
            messageId: "noWhileLoop",
          },
        ],
      },
      // Do...while loop
      {
        name: "Do...while loop should use functional methods",
        code: `
          let i = 0
          do {
            console.log(items[i])
            i++
          } while (i < items.length)
        `,
        errors: [
          {
            messageId: "noDoWhileLoop",
          },
        ],
      },
      // For loop with array.push (transformation pattern)
      {
        name: "For loop with push should use map",
        code: `
          const results = []
          for (let i = 0; i < items.length; i++) {
            results.push(items[i].toUpperCase())
          }
        `,
        errors: [
          {
            messageId: "noForLoop",
          },
        ],
      },
      // Multiple loops
      {
        name: "Multiple loops should all be flagged",
        code: `
          for (let i = 0; i < items.length; i++) {
            console.log(items[i])
          }
          
          for (const item of otherItems) {
            process(item)
          }
          
          while (condition) {
            doSomething()
          }
        `,
        errors: [
          {
            messageId: "noForLoop",
          },
          {
            messageId: "noForOfLoop",
          },
          {
            messageId: "noWhileLoop",
          },
        ],
      },
      // Nested loops
      {
        name: "Nested loops should be flagged",
        code: `
          for (let i = 0; i < matrix.length; i++) {
            for (let j = 0; j < matrix[i].length; j++) {
              console.log(matrix[i][j])
            }
          }
        `,
        errors: [
          {
            messageId: "noForLoop",
          },
          {
            messageId: "noForLoop",
          },
        ],
      },
    ],
  })
})
