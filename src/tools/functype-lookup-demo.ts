/**
 * Demo of functype lookup tools for AI agents
 */

import { functypeExamplesTool, functypeLookupTool, functypeSearchTool } from "./functype-lookup"

// Simulate AI agent using the tools

console.log("🔍 Functype Lookup Tools Demo\n")

// Tool 1: Look up type information
console.log("1. Looking up 'Option' type information:")
const optionInfo = functypeLookupTool.execute({ typeName: "Option" })
console.log({
  name: optionInfo.name,
  description: optionInfo.description,
  sourcePath: optionInfo.sourcePath,
  interfaces: optionInfo.interfaces.slice(0, 3), // Show first 3
  keyMethods: optionInfo.keyMethods.slice(0, 5), // Show first 5
  relatedTypes: optionInfo.relatedTypes,
})

console.log("\n2. Getting examples for 'List':")
const listExamples = functypeExamplesTool.execute({
  typeName: "List",
  category: "basic",
})
if (listExamples[0]) {
  console.log(listExamples[0])
}

console.log("\n3. Searching for async-related types:")
const asyncTypes = functypeSearchTool.execute({ query: "async" })
asyncTypes.forEach((type) => {
  console.log(`- ${type.name}: ${type.description}`)
})

console.log("\n4. Looking up a non-existent type:")
const notFound = functypeLookupTool.execute({ typeName: "NonExistent" })
console.log({
  found: notFound.found,
  description: notFound.description,
})

// Example AI agent responses using these tools

console.log("\n🤖 Example AI Agent Responses:\n")

// Scenario 1: User asks about Option
console.log("User: 'What is Option in functype?'")
console.log("AI Agent response:")
const optionLookup = functypeLookupTool.execute({ typeName: "Option" })
console.log(`
Option is ${optionLookup.description}

**Source**: ${optionLookup.sourcePath}
**Key Methods**: ${optionLookup.keyMethods.join(", ")}
**Use Cases**: 
${optionLookup.commonUseCases.map((use) => `• ${use}`).join("\n")}

**Related Types**: ${optionLookup.relatedTypes.join(", ")}
`)

// Scenario 2: User asks for List examples
console.log("\nUser: 'Show me how to use List'")
console.log("AI Agent response:")
const listExample = functypeExamplesTool.execute({ typeName: "List" })
if (listExample[0]) {
  console.log(`
Here's a basic List example:

\`\`\`typescript
${listExample[0].code}
\`\`\`

${listExample[0].description}
`)
}

// Scenario 3: User asks about error handling
console.log("\nUser: 'How do I handle errors in functype?'")
console.log("AI Agent response:")
const errorTypes = functypeSearchTool.execute({ query: "error" })
console.log(`
Functype provides several options for error handling:

${errorTypes
  .map(
    (type) => `
**${type.name}**: ${type.description}
Common use cases: ${type.commonUseCases.slice(0, 2).join(", ")}
`,
  )
  .join("")}

Would you like examples for any of these?
`)

// Tool definitions for external AI systems
console.log("\n📋 Tool Definitions for AI Systems:\n")

console.log("Tool 1 - functype_lookup:")
console.log(JSON.stringify(functypeLookupTool, null, 2))

console.log("\nTool 2 - functype_examples:")
console.log(JSON.stringify(functypeExamplesTool, null, 2))

console.log("\nTool 3 - search_functypes:")
console.log(JSON.stringify(functypeSearchTool, null, 2))

// Integration with pattern suggester
console.log("\n🔗 Integration with Pattern Suggester:\n")

// Example: AI detects array operations and suggests both pattern and type info
const userCode = "array.map(x => x + 1).filter(x => x > 5)"
console.log(`User code: ${userCode}`)
console.log("AI could suggest:")
console.log("1. Pattern: Use List for immutable array operations")
console.log("2. Type info: List provides map, filter with immutability")

const listInfo = functypeLookupTool.execute({ typeName: "List" })
const listExample2 = functypeExamplesTool.execute({ typeName: "List", category: "basic" })

console.log(`
**Refactored with List**:
\`\`\`typescript
${listExample2[0] ? listExample2[0].code : "// Example not available"}
\`\`\`

**Why List?** ${listInfo.description}
**Source**: ${listInfo.sourcePath}
`)

export { functypeExamplesTool, functypeLookupTool, functypeSearchTool }
