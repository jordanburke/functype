/**
 * Functype lookup tools for AI agents
 */

import { List } from "@/list"

import { compilableExamples } from "./examples"
import { type FunctypeInfo, functypeRegistry } from "./functype-registry"

export interface FunctypeLookupResult {
  name: string
  description: string
  category: string
  sourcePath: string
  testPath?: string
  interfaces: string[]
  keyMethods: string[]
  relatedTypes: string[]
  commonUseCases: string[]
  found: boolean
}

export interface FunctypeExample {
  title: string
  description: string
  code: string
  category: "basic" | "intermediate" | "advanced"
}

/**
 * Tool 1: Look up functype type information and source files
 */
export function functypeLookup(typeName: string): FunctypeLookupResult {
  const normalizedName = typeName.charAt(0).toUpperCase() + typeName.slice(1).toLowerCase()
  const info = functypeRegistry[normalizedName]

  if (!info) {
    return {
      name: typeName,
      description: `Type '${typeName}' not found in functype registry`,
      category: "Unknown",
      sourcePath: "",
      interfaces: [],
      keyMethods: [],
      relatedTypes: [],
      commonUseCases: [],
      found: false,
    }
  }

  return {
    name: info.name,
    description: info.description,
    category: info.category,
    sourcePath: info.sourcePath,
    testPath: info.testPath,
    interfaces: info.implements,
    keyMethods: info.keyMethods,
    relatedTypes: info.relatedTypes ?? [],
    commonUseCases: info.commonUseCases,
    found: true,
  }
}

/**
 * Tool 2: Get usage examples for a functype type
 */
export function functypeExamples(typeName: string): List<FunctypeExample> {
  const normalizedName = typeName.charAt(0).toUpperCase() + typeName.slice(1).toLowerCase()

  // Use compilable examples first, fall back to generated ones
  const compiledExamples = compilableExamples[normalizedName]
  if (compiledExamples) {
    return List(compiledExamples)
  }

  // Fallback to generated examples for types not yet migrated
  const examples = generateExamplesFor(normalizedName)
  return List(examples)
}

/**
 * Search functype types by keyword
 */
export function searchFunctypes(query: string): List<FunctypeInfo> {
  const queryLower = query.toLowerCase()
  const results = Object.values(functypeRegistry).filter(
    (info) =>
      info.name.toLowerCase().includes(queryLower) ||
      info.description.toLowerCase().includes(queryLower) ||
      info.commonUseCases.some((useCase) => useCase.toLowerCase().includes(queryLower)) ||
      info.keyMethods.some((method) => method.toLowerCase().includes(queryLower)),
  )

  return List(results)
}

/**
 * Get all available functype types
 */
export function getAllFunctypes(): List<string> {
  return List(Object.keys(functypeRegistry))
}

/**
 * Generate examples for specific types
 */
function generateExamplesFor(typeName: string): FunctypeExample[] {
  switch (typeName) {
    case "Option":
      return [
        {
          title: "Basic Option Usage",
          description: "Creating and using Option to handle nullable values",
          code: `import { Option } from "@/option"

// Creating Options
const some = Option("hello")
const none = Option(null)

// Safe operations
const result = Option(user)
  .map(u => u.name)
  .map(name => name.toUpperCase())
  .orElse("Anonymous")`,
          category: "basic",
        },
        {
          title: "Option Chaining",
          description: "Chaining operations with flatMap to avoid nested nulls",
          code: `import { Option } from "@/option"

// Instead of: user?.profile?.avatar?.url
const avatarUrl = Option(user)
  .flatMap(u => Option(u.profile))
  .flatMap(p => Option(p.avatar))
  .map(a => a.url)
  .orElse("/default-avatar.png")`,
          category: "intermediate",
        },
        {
          title: "Option with Filtering",
          description: "Using filter to add conditions",
          code: `import { Option } from "@/option"

const activeUser = Option(user)
  .filter(u => u.isActive)
  .filter(u => u.email.includes("@"))
  .map(u => ({ ...u, status: "online" }))
  .orElse(null)`,
          category: "intermediate",
        },
      ]

    case "List":
      return [
        {
          title: "Basic List Operations",
          description: "Creating and transforming Lists",
          code: `import { List } from "@/list"

const numbers = List([1, 2, 3, 4, 5])

const doubled = numbers
  .filter(n => n > 2)
  .map(n => n * 2)
  .toArray() // [6, 8, 10]`,
          category: "basic",
        },
        {
          title: "List Reduction",
          description: "Aggregating List data",
          code: `import { List } from "@/list"

const words = List(["hello", "world", "functype"])

const totalLength = words
  .map(w => w.length)
  .foldLeft(0)((sum, len) => sum + len)

const concatenated = words
  .reduce((acc, word) => acc + " " + word, "")`,
          category: "intermediate",
        },
        {
          title: "Complex List Processing",
          description: "Advanced List operations with flatMap",
          code: `import { List } from "@/list"

const users = List([
  { name: "Alice", hobbies: ["reading", "coding"] },
  { name: "Bob", hobbies: ["gaming", "music"] }
])

const allHobbies = users
  .flatMap(user => List(user.hobbies))
  .toSet() // Remove duplicates
  .toArray()`,
          category: "advanced",
        },
      ]

    case "Either":
      return [
        {
          title: "Basic Either for Error Handling",
          description: "Using Either instead of throwing exceptions",
          code: `import { Either, Left, Right } from "@/either"

function divide(a: number, b: number): Either<string, number> {
  return b === 0 
    ? Left("Division by zero")
    : Right(a / b)
}

const result = divide(10, 2)
  .map(n => n * 2)
  .fold(
    error => \`Error: \${error}\`,
    value => \`Result: \${value}\`
  )`,
          category: "basic",
        },
        {
          title: "Either for Validation",
          description: "Chaining validations with Either",
          code: `import { Either, Left, Right } from "@/either"

function validateEmail(email: string): Either<string, string> {
  return email.includes("@") 
    ? Right(email)
    : Left("Invalid email format")
}

function validateUser(user: any): Either<string, User> {
  return validateEmail(user.email)
    .map(email => ({ ...user, email }))
    .flatMap(u => u.age >= 18 
      ? Right(u) 
      : Left("Must be 18 or older")
    )
}`,
          category: "intermediate",
        },
      ]

    case "Try":
      return [
        {
          title: "Basic Try Usage",
          description: "Wrapping operations that might throw",
          code: `import { Try } from "@/try"

const parseJson = (str: string) => 
  Try(() => JSON.parse(str))
    .fold(
      error => \`Parse error: \${error.message}\`,
      data => \`Parsed: \${JSON.stringify(data)}\`
    )

const result = parseJson('{"name": "Alice"}')`,
          category: "basic",
        },
        {
          title: "Try with Recovery",
          description: "Handling errors with fallback values",
          code: `import { Try } from "@/try"

const safeOperation = Try(() => {
  // Some risky operation
  return riskyFunction()
})
.recover(error => {
  console.warn("Operation failed, using default:", error)
  return defaultValue
})
.map(result => processResult(result))`,
          category: "intermediate",
        },
      ]

    case "Map":
      return [
        {
          title: "Basic Map Operations",
          description: "Creating and using immutable Maps",
          code: `import { Map } from "@/map"

const userMap = Map<string, User>()
  .set("alice", { name: "Alice", age: 30 })
  .set("bob", { name: "Bob", age: 25 })

const alice = userMap
  .get("alice")
  .orElse(null)

const names = userMap
  .map((user, key) => user.name)
  .toArray()`,
          category: "basic",
        },
      ]

    default:
      return [
        {
          title: "Basic Usage",
          description: `Basic ${typeName} operations`,
          code: `// Check the source file for detailed examples
// Path: ${functypeRegistry[typeName]?.sourcePath ?? "Not found"}`,
          category: "basic",
        },
      ]
  }
}

/**
 * AI Agent Tool Definitions
 */

export const functypeLookupTool = {
  name: "functype_lookup",
  description: "Look up functype data structure information, source files, and available methods",
  parameters: {
    type: "object",
    properties: {
      typeName: {
        type: "string",
        description: "Name of the functype data structure (e.g., 'Option', 'List', 'Either')",
      },
    },
    required: ["typeName"],
  },
  execute: ({ typeName }: { typeName: string }) => {
    return functypeLookup(typeName)
  },
}

export const functypeExamplesTool = {
  name: "functype_examples",
  description: "Get usage examples and code snippets for functype data structures",
  parameters: {
    type: "object",
    properties: {
      typeName: {
        type: "string",
        description: "Name of the functype data structure (e.g., 'Option', 'List', 'Either')",
      },
      category: {
        type: "string",
        enum: ["basic", "intermediate", "advanced", "all"],
        description: "Complexity level of examples to return",
        default: "all",
      },
    },
    required: ["typeName"],
  },
  execute: ({
    typeName,
    category = "all",
  }: {
    typeName: string
    category?: "basic" | "intermediate" | "advanced" | "all"
  }) => {
    const examples = functypeExamples(typeName)

    if (category === "all") {
      return examples.toArray()
    }

    return examples.filter((ex) => ex.category === category).toArray()
  },
}

export const functypeSearchTool = {
  name: "search_functypes",
  description: "Search functype data structures by keyword, use case, or method name",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search term (e.g., 'async', 'collection', 'error handling')",
      },
    },
    required: ["query"],
  },
  execute: ({ query }: { query: string }) => {
    return searchFunctypes(query).toArray()
  },
}
