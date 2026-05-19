import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-map"

describe("prefer-map", () => {
  ruleTester.run("prefer-map", rule, {
    valid: [
      // Using map
      {
        name: "Using map is preferred",
        code: "const doubled = numbers.map(n => n * 2)",
      },
      // Using other functional methods
      {
        name: "Using filter is allowed",
        code: "const evens = numbers.filter(n => n % 2 === 0)",
      },
      // Simple forEach without transformation
      {
        name: "Simple forEach for side effects is allowed",
        code: "numbers.forEach(n => console.log(n))",
      },
      // Non-array operations
      {
        name: "Non-array operations are allowed",
        code: "const result = calculateValue(input)",
      },
    ],
    invalid: [
      // For loop with transformation
      {
        name: "For loop with transformation should use map",
        code: `
          const results = []
          for (let i = 0; i < items.length; i++) {
            results.push(transform(items[i]))
          }
        `,
        errors: [
          {
            messageId: "preferMapOverLoop",
            data: { collection: "array" },
          },
        ],
      },
      // For...of loop with push
      {
        name: "For...of loop with push should use map",
        code: `
          const results = []
          for (const item of items) {
            results.push(item.toUpperCase())
          }
        `,
        errors: [
          {
            messageId: "preferMapOverLoop",
            data: { collection: "iterable" },
          },
        ],
      },
      // For...in loop with transformation
      {
        name: "For...in loop with transformation should use map",
        code: `
          const results = []
          for (const key in obj) {
            results.push(obj[key].toString())
          }
        `,
        errors: [
          {
            messageId: "preferMapOverLoop",
            data: { collection: "object" },
          },
        ],
      },
      // forEach with simple property access (could be map)
      {
        name: "forEach with property access should consider map",
        code: "items.forEach(item => item.name)",
        errors: [
          {
            messageId: "preferMapChain",
          },
        ],
        output: "items.map(item => item.name)",
      },
      // Manual push inside forEach
      {
        name: "Manual push inside forEach should use map",
        code: `
          const names = []
          items.forEach(item => {
            names.push(item.name)
          })
        `,
        errors: [
          {
            messageId: "preferMapOverPush",
          },
        ],
      },
      // Complex transformation in for loop
      {
        name: "Complex transformation in for loop",
        code: `
          const processed = []
          for (let i = 0; i < users.length; i++) {
            processed.push({
              id: users[i].id,
              name: users[i].name.toUpperCase(),
              active: true
            })
          }
        `,
        errors: [
          {
            messageId: "preferMapOverLoop",
            data: { collection: "array" },
          },
        ],
      },
      // Multiple push operations suggesting map
      {
        name: "Multiple loops with push should all use map",
        code: `
          const results1 = []
          for (const item of list1) {
            results1.push(process(item))
          }
          
          const results2 = []
          for (let i = 0; i < list2.length; i++) {
            results2.push(list2[i].value)
          }
        `,
        errors: [
          {
            messageId: "preferMapOverLoop",
            data: { collection: "iterable" },
          },
          {
            messageId: "preferMapOverLoop",
            data: { collection: "array" },
          },
        ],
      },
    ],
  })
})
