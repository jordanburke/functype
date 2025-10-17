/**
 * Example showing how pattern suggestions are loaded from compile-tested files
 */

import { formatSuggestion, suggestPattern } from "./pattern-suggester"
import { compiledPatterns } from "./patterns"

// Show that patterns are now loaded from actual TypeScript files
console.log(`Loaded ${compiledPatterns.length} patterns from compiled TypeScript files`)

// Example 1: Null check pattern
const nullCheckCode = `
function getName(user) {
  if (user !== null && user !== undefined) {
    return user.name
  }
  return "Anonymous"
}
`

const suggestion1 = suggestPattern(nullCheckCode)
if (suggestion1._tag === "Some") {
  console.log("\nNull check pattern suggestion:")
  console.log(formatSuggestion(suggestion1.value!))
}

// Example 2: Try-catch pattern
const errorHandlingCode = `
function loadConfig() {
  try {
    const data = fs.readFileSync('config.json', 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Failed to load config:', error)
    return {}
  }
}
`

const suggestion2 = suggestPattern(errorHandlingCode)
if (suggestion2._tag === "Some") {
  console.log("\nError handling pattern suggestion:")
  console.log(formatSuggestion(suggestion2.value!))
}

// Show how patterns are compile-tested
console.log("\n✅ All pattern examples are compile-tested:")
console.log("- Before examples compile as valid TypeScript")
console.log("- After examples use functype correctly")
console.log("- No more runtime errors from typos in examples!")

// Demonstrate the pattern structure
const examplePattern = compiledPatterns[0]
if (examplePattern) {
  console.log("\nExample pattern structure:")
  console.log({
    pattern: examplePattern.pattern,
    description: examplePattern.description,
    confidence: examplePattern.confidence,
    tags: examplePattern.tags,
    // The examples are multi-line strings from the actual files
    exampleLength: {
      before: examplePattern.example.before.split("\n").length,
      after: examplePattern.example.after.split("\n").length,
    },
  })
}
