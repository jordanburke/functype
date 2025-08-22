/**
 * Example AI agent integration for functype pattern suggestions
 * This demonstrates how an AI agent tool could use the pattern suggester
 */

import { formatSuggestion, suggestPatterns } from "./pattern-suggester"

// Example AI agent tool definition (for Claude, GPT, etc.)
export const functypeSuggesterTool = {
  name: "suggest_functype_pattern",
  description:
    "Analyzes JavaScript/TypeScript code and suggests functype patterns for functional programming improvements",
  parameters: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "The JavaScript/TypeScript code snippet to analyze",
      },
      limit: {
        type: "number",
        description: "Maximum number of pattern suggestions to return",
        default: 3,
      },
      format: {
        type: "string",
        enum: ["json", "markdown"],
        description: "Output format for the suggestions",
        default: "json",
      },
    },
    required: ["code"],
  },

  // The function that would be called by the AI agent
  execute: ({ code, limit = 3, format = "json" }: { code: string; limit?: number; format?: "json" | "markdown" }) => {
    const suggestions = suggestPatterns(code, limit)

    if (format === "markdown") {
      return suggestions
        .map((pattern) => formatSuggestion(pattern))
        .toArray()
        .join("\n\n---\n\n")
    }

    // JSON format for structured responses
    return {
      suggestionsFound: suggestions.size,
      suggestions: suggestions
        .map((pattern) => ({
          pattern: pattern.pattern,
          description: pattern.description,
          confidence: pattern.confidence,
          example: pattern.example,
        }))
        .toArray(),
    }
  },
}

// Example usage by an AI agent
/*async function aiAgentExample() {
  // User provides some code to review
  const userCode = `
    function processUser(user) {
      if (user === null || user === undefined) {
        return null;
      }

      try {
        const data = JSON.parse(user.data);
        const items = data.items.filter(item => item.active);
        return items.map(item => item.value);
      } catch (error) {
        console.error('Failed to process user:', error);
        return [];
      }
    }
  `

  // AI agent uses the tool
  const result = await functypeSuggesterTool.execute({
    code: userCode,
    limit: 3,
    format: "json",
  })

  // AI agent can now use these suggestions in its response
  console.log("Pattern suggestions:", result)

  // Example AI response using the suggestions:
  const aiResponse = `
I've analyzed your code and found ${result.suggestionsFound} patterns that could benefit from functype:

${result.suggestions
  .map(
    (s, i) => `
${i + 1}. **${s.description}** (${Math.round(s.confidence * 100)}% confidence)
   - Current pattern: ${s.pattern}
   - See example transformation in suggestion
`,
  )
  .join("\n")}

Would you like me to show you how to refactor this code using functype?
  `.trim()

  return aiResponse
}*/

// Example: Getting markdown formatted output for display
function getMarkdownSuggestions(code: string) {
  return functypeSuggesterTool.execute({
    code,
    format: "markdown",
  })
}

export { getMarkdownSuggestions }
