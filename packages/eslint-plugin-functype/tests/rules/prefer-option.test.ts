import { describe } from "vitest"
import { ruleTester } from "../utils/rule-tester"
import rule from "../../src/rules/prefer-option"

describe("prefer-option", () => {
  ruleTester.run("prefer-option", rule, {
    valid: [
      {
        name: "A qualified functype.Wire is recognized",
        code: "type Row = { readonly email: functype.Wire<string | null> }",
      },
      {
        name: "An import-type Wire is recognized",
        code: 'type Row = { readonly email: import("functype").Wire<string | null> }',
      },
      {
        name: "Custom wireTypes names are recognized",
        code: "type Row = { readonly email: Dto<string | null> }",
        options: [{ wireTypes: ["Dto"] }],
      },
      // #325 B — nullables inside Wire<…> are the declared serialization shape; `null` survives
      // JSON.stringify and Option does not.
      {
        name: "A wired nullable field",
        code: "type Row = { readonly email: Wire<string | null> }",
      },
      {
        name: "Every nullable inside a wired row type",
        code: "type UserRow = Wire<{ readonly email: string | null; readonly phone: string | undefined }>",
      },
      {
        name: "A wired return type",
        code: "async function load(): Promise<Wire<{ readonly name: string | null }>> { return { name: null } }",
      },
      // #241 — @interop covers nullables that a host contract requires, in signatures and bodies.
      {
        name: "Nullable parameter and return type inside an @interop function",
        code: `/** @interop This hook converts nullable JS values into Option, so its input must be nullable. */
export function useOption<A>(initial?: A): { set: (a: A | null | undefined) => void } {
  const set = (a: A | null | undefined) => undefined
  return { set }
}`,
      },
      {
        name: "Nullable field in an @interop type alias",
        code: `/** @interop Mirrors the shape the payment SDK posts to our webhook. */
type WebhookBody = { readonly customer: string | null }`,
      },
      // #325 C — `null` is idiomatic React state; an Option in a hook's type argument buys nothing.
      {
        name: "useState with a nullable type argument",
        code: "const [user, setUser] = useState<User | null>(null)",
      },
      {
        name: "useRef with a nullable type argument",
        code: "const ref = useRef<HTMLDivElement | null>(null)",
      },
      {
        name: "React.useState with a nullable field in the state shape",
        code: "const [state, setState] = React.useState<{ readonly user: User | null }>({ user: null })",
      },
      // Already using Option
      {
        name: "Option type is allowed",
        code: 'const value: Option<string> = Some("test")',
      },
      // Non-nullable types
      {
        name: "Non-nullable types are allowed",
        code: 'const value: string = "test"',
      },
      // Function parameters with non-nullable types
      {
        name: "Function with non-nullable parameters",
        code: "function test(value: string): string { return value }",
      },
      // Complex types without null/undefined
      {
        name: "Complex types without nullability",
        code: 'const value: { name: string; age: number } = { name: "test", age: 25 }',
      },
      // Multi-member union should not flag
      {
        name: "Multi-type union with null is not flagged",
        code: "const value: string | number | null = null",
      },
    ],
    invalid: [
      {
        name: "wireTypes: [] turns the Wire exemption off",
        code: "type Row = { readonly email: Wire<string | null> }",
        options: [{ wireTypes: [] }],
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | null" },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "type Row = { readonly email: Wire<Option<string>> }",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: `import { Option } from "functype"
type Row = { readonly email: Wire<string | null> }`,
              },
            ],
          },
        ],
      },
      {
        name: "A nullable beside (not inside) a Wire type is still reported",
        code: "function f(row: Wire<Row>, fallback: string | null) {}",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | null" },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "function f(row: Wire<Row>, fallback: Option<string>) {}",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: `import { Option } from "functype"
function f(row: Wire<Row>, fallback: string | null) {}`,
              },
            ],
          },
        ],
      },
      {
        name: "allowUseState: false reports hook type arguments too",
        code: "const [user, setUser] = useState<User | null>(null)",
        options: [{ allowUseState: false }],
        errors: [
          {
            messageId: "preferOption",
            data: { type: "User", nullable: "User | null" },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "User" },
                output: "const [user, setUser] = useState<Option<User>>(null)",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: `import { Option } from "functype"
const [user, setUser] = useState<User | null>(null)`,
              },
            ],
          },
        ],
      },
      {
        name: "A nullable parameter of a component is still reported",
        code: "const Avatar = (user: User | null) => user",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "User", nullable: "User | null" },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "User" },
                output: "const Avatar = (user: Option<User>) => user",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: `import { Option } from "functype"
const Avatar = (user: User | null) => user`,
              },
            ],
          },
        ],
      },
      // Basic nullable type
      {
        name: "String or null should use Option",
        code: "const value: string | null = null",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | null" },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "const value: Option<string> = null",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst value: string | null = null',
              },
            ],
          },
        ],
      },
      // String or undefined
      {
        name: "String or undefined should use Option",
        code: "const value: string | undefined = undefined",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | undefined" },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "const value: Option<string> = undefined",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst value: string | undefined = undefined',
              },
            ],
          },
        ],
      },
      // String with both null and undefined
      {
        name: "String with null and undefined should use Option",
        code: "const value: string | null | undefined = null",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | null | undefined" },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "const value: Option<string> = null",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst value: string | null | undefined = null',
              },
            ],
          },
        ],
      },
      // Function return type
      {
        name: "Function return type should use Option",
        code: "function getValue(): string | null { return null }",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string", nullable: "string | null" },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string" },
                output: "function getValue(): Option<string> { return null }",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nfunction getValue(): string | null { return null }',
              },
            ],
          },
        ],
      },
      // Complex type with null
      {
        name: "Complex type with null should use Option",
        code: "const user: { name: string; age: number } | null = null",
        errors: [
          {
            messageId: "preferOption",
            data: {
              type: "{ name: string; age: number }",
              nullable: "{ name: string; age: number } | null",
            },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "{ name: string; age: number }" },
                output: "const user: Option<{ name: string; age: number }> = null",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst user: { name: string; age: number } | null = null',
              },
            ],
          },
        ],
      },
      // Array type with null
      {
        name: "Array type with null should use Option",
        code: "const items: string[] | null = null",
        errors: [
          {
            messageId: "preferOption",
            data: { type: "string[]", nullable: "string[] | null" },
            suggestions: [
              {
                messageId: "suggestOptionType",
                data: { type: "string[]" },
                output: "const items: Option<string[]> = null",
              },
              {
                messageId: "suggestAddImport",
                data: { symbol: "Option" },
                output: 'import { Option } from "functype"\nconst items: string[] | null = null',
              },
            ],
          },
        ],
      },
    ],
  })
})

/**
 * #446: `a?: T` and `a: T | undefined` on a member or parameter both mean "may be absent", and the caller
 * writes `<X b="v" />` or `f()`. Both are skipped by default, so the two spellings get the same verdict;
 * `checkOptionalMembers` reports both. `T | null` there is a deliberate nullable and is still reported.
 */
describe("prefer-option optional members and parameters (#446)", () => {
  const reportedOptional = (name: string, type: string) => ({
    messageId: "preferOptionOverOptional" as const,
    data: { name, type },
  })

  ruleTester.run("prefer-option", rule, {
    valid: [
      {
        name: "The issue's Props: ?: and | undefined get the same verdict",
        code: "export type Props = { a?: string; b: string | undefined; c?: string | undefined }",
      },
      {
        name: "An interface member",
        code: "interface Options { readonly timeout: number | undefined }",
      },
      {
        name: "Parameters, with and without ?:",
        code: 'export const f = (x?: string): string => x ?? ""\nexport const g = (x: string | undefined): string => x ?? ""',
      },
      {
        name: "A parameter with a default",
        code: "function f(x: string | undefined = undefined) { return x }",
      },
      {
        name: "A function type's and a method signature's parameters",
        code: "type F = (x: string | undefined) => void\ninterface Api { get(id: string | undefined): void }",
      },
      {
        name: "A constructor parameter property",
        code: "class C { constructor(private readonly x: string | undefined) {} }",
      },
      {
        name: "checkOptionalMembers skips a member that is already an Option",
        code: "type Props = { a?: Option<string> }",
        options: [{ checkOptionalMembers: true }],
      },
      {
        name: "checkOptionalMembers still honors Wire<…>",
        code: "type Row = Wire<{ a?: string }>",
        options: [{ checkOptionalMembers: true }],
      },
    ],
    invalid: [
      {
        name: "A nullable prop is still reported: null is a deliberate value, not absence",
        code: "type Props = { b: string | null }",
        errors: [{ messageId: "preferOption", suggestions: 2 }],
      },
      {
        name: "?: T | null is still reported",
        code: "type Props = { c?: string | null }",
        errors: [{ messageId: "preferOption", suggestions: 2 }],
      },
      {
        name: "A return type is still reported",
        code: "function f(): string | undefined { return undefined }",
        errors: [{ messageId: "preferOption", suggestions: 2 }],
      },
      {
        name: "A variable is still reported",
        code: "let v: string | undefined",
        errors: [{ messageId: "preferOption", suggestions: 2 }],
      },
      {
        name: "A class field is still reported",
        code: "class C { name: string | undefined = undefined }",
        errors: [{ messageId: "preferOption", suggestions: 2 }],
      },
      {
        name: "A generic argument inside a member is still reported",
        code: "type Props = { names: Array<string | undefined> }",
        errors: [{ messageId: "preferOption", suggestions: 2 }],
      },
      {
        name: "checkOptionalMembers reports both spellings, once each",
        code: "export type Props = { a?: string; b: string | undefined; c?: string | undefined }",
        options: [{ checkOptionalMembers: true }],
        errors: [
          reportedOptional("a", "string"),
          { messageId: "preferOption", suggestions: 2 },
          reportedOptional("c", "string"),
        ],
      },
      {
        name: "?: T | null is reported once with checkOptionalMembers, by the union check",
        code: "type P = { c?: string | null }\nconst f = (x?: string | null) => x",
        options: [{ checkOptionalMembers: true }],
        errors: [
          { messageId: "preferOption", suggestions: 2 },
          { messageId: "preferOption", suggestions: 2 },
        ],
      },
      {
        name: "A string-literal key is named without its quotes",
        code: "type P = { 'a-b'?: string }",
        options: [{ checkOptionalMembers: true }],
        errors: [reportedOptional("a-b", "string")],
      },
      {
        name: "checkOptionalMembers reports optional and | undefined parameters",
        code: 'export const f = (x?: string): string => x ?? ""\nexport const g = (y: string | undefined): string => y ?? ""',
        options: [{ checkOptionalMembers: true }],
        errors: [reportedOptional("x", "string"), { messageId: "preferOption", suggestions: 2 }],
      },
    ],
  })
})
