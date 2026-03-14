import { describe } from "vitest"
import { VisualRuleTester, showTransformations } from "../utils/visual-rule-tester"
import preferOption from "../../src/rules/prefer-option"
import preferList from "../../src/rules/prefer-list"
import noImperativeLoops from "../../src/rules/no-imperative-loops"

describe("Visual Transformation Demo", () => {
  describe("prefer-option transformations", () => {
    VisualRuleTester.run(
      "prefer-option",
      preferOption,
      {
        valid: [],
        invalid: showTransformations([
          {
            name: "🚫 Nullable User Function → Option<User> (Manual Fix Required)",
            code: "function findUser(id: string): User | null { return getUser(id) }",
            errors: [{ messageId: "preferOption" }],
          },
          {
            name: "🚫 Complex Nullable Type → Option<T> (Manual Fix Required)",
            code: "const userProfile: { name: string; email: string } | null = getUserProfile()",
            errors: [{ messageId: "preferOption" }],
          },
          {
            name: "🚫 Optional Configuration → Option<Config> (Manual Fix Required)",
            code: "const config: AppConfig | undefined = loadConfig()",
            errors: [{ messageId: "preferOption" }],
          },
        ]),
      },
      { showAll: true },
    )
  })

  describe("prefer-list transformations", () => {
    VisualRuleTester.run(
      "prefer-list",
      preferList,
      {
        valid: [],
        invalid: showTransformations([
          {
            name: "🚫 Array Type → List<T> (Manual Fix Required)",
            code: 'const userIds: string[] = ["user1", "user2", "user3"]',
            errors: [{ messageId: "preferList" }],
          },
          {
            name: "🚫 Array<T> → List<T> (Manual Fix Required)",
            code: "const scores: Array<number> = [85, 92, 78, 96]",
            errors: [{ messageId: "preferList" }],
          },
          {
            name: "🚫 Array Literal → List.from() (Manual Fix Required)",
            code: 'const colors = ["red", "green", "blue"]',
            errors: [{ messageId: "preferListLiteral" }],
          },
          {
            name: "🚫 Function Parameter Array → List<T> (Manual Fix Required)",
            code: "function processItems(items: ProcessedItem[]): void { }",
            errors: [{ messageId: "preferList" }],
          },
        ]),
      },
      { showAll: true },
    )
  })

  describe("no-imperative-loops transformations", () => {
    VisualRuleTester.run(
      "no-imperative-loops",
      noImperativeLoops,
      {
        valid: [],
        invalid: [
          // These aren't auto-fixable but show the violations detected
          {
            name: "🚫 For Loop → Functional Methods (Manual Fix Required)",
            code: `
            for (let i = 0; i < items.length; i++) {
              console.log(items[i])
            }
          `,
            errors: [{ messageId: "noForLoop" }],
            showTransformation: true,
          },
          {
            name: "🚫 While Loop → Functional Methods (Manual Fix Required)",
            code: `
            let sum = 0
            let i = 0
            while (i < numbers.length) {
              sum += numbers[i]
              i++
            }
          `,
            errors: [{ messageId: "noWhileLoop" }],
            showTransformation: true,
          },
          {
            name: "🚫 For-of Loop → Functional Methods (Manual Fix Required)",
            code: `
            for (const user of users) {
              processUser(user)
            }
          `,
            errors: [{ messageId: "noForOfLoop" }],
            showTransformation: true,
          },
        ],
      },
      { showAll: true },
    )
  })
})

// Mock types for compilation
interface User {
  id: string
  name: string
}

interface AppConfig {
  apiUrl: string
  timeout: number
}

interface ProcessedItem {
  id: string
  value: number
}

// Mock functions
declare function getUser(id: string): User | null
declare function getUserProfile(): { name: string; email: string } | null
declare function loadConfig(): AppConfig | undefined
declare function processUser(user: User): void
declare const items: any[]
declare const numbers: number[]
declare const users: User[]
