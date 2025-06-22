import { describe, expect, it } from "vitest"

import { CodeAwareTask, type CodeContext, type SelfHealingConfig } from "@/core/task/CodeAwareTask"

describe("CodeAwareTask", () => {
  describe("fitness evaluation", () => {
    it("should evaluate basic code fitness", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const context: CodeContext = {
        source: "function add(a: number, b: number): number { return a + b }",
        functionName: "add",
        llmContext: {
          intent: "Add two numbers together",
        },
      }

      const fitness = await task.evaluateFitness(context, 5)

      expect(fitness.score).toBeGreaterThan(50)
      expect(fitness.metrics.typeSafety).toBeGreaterThan(50)
      expect(fitness.feedback).toContain("Uses type annotations")
    })

    it("should penalize code with security issues", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const context: CodeContext = {
        source: "function dangerous() { eval('malicious code'); return innerHTML = userInput }",
        functionName: "dangerous",
        llmContext: {
          intent: "Dangerous function for testing",
        },
      }

      const fitness = await task.evaluateFitness(context)

      expect(fitness.metrics.security).toBeLessThan(50)
      expect(fitness.feedback).toContain("Uses eval() which can be dangerous")
      expect(fitness.feedback).toContain("Uses innerHTML which can be vulnerable to XSS")
    })

    it("should reward good TypeScript practices", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const context: CodeContext = {
        source: `
          function processUser(user?: User): string {
            if (typeof user === 'object' && user !== null) {
              return user.name ?? 'Unknown'
            }
            throw new Error('Invalid user')
          }
        `,
        functionName: "processUser",
        llmContext: {
          intent: "Process user object safely",
        },
      }

      const fitness = await task.evaluateFitness(context)

      expect(fitness.metrics.typeSafety).toBeGreaterThan(70)
      expect(fitness.metrics.maintainability).toBeGreaterThan(60)
      expect(fitness.feedback).toContain("Uses type guards for runtime safety")
      expect(fitness.feedback).toContain("Uses nullish coalescing")
      expect(fitness.feedback).toContain("Includes error handling")
    })
  })

  describe("custom fitness functions", () => {
    it("should integrate custom fitness functions", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const context: CodeContext = {
        source: "function customLogic() { return 'domain specific' }",
        functionName: "customLogic",
        llmContext: {
          intent: "Custom business logic",
        },
      }

      const customFitness = CodeAwareTask.createCustomFitnessFunction("businessLogic", async () => ({
        score: 95,
        feedback: ["Follows business rules perfectly"],
        suggestions: ["Consider adding logging"],
      }))

      const fitness = await task.evaluateFitness(context, undefined, [customFitness])

      expect(fitness.feedback).toContain("Follows business rules perfectly")
      expect(fitness.suggestions).toContain("Consider adding logging")
    })
  })

  describe("self-healing execution", () => {
    it("should execute successfully without healing when code is good", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const context: CodeContext = {
        source: "function good() { return 'success' }",
        functionName: "good",
        llmContext: {
          intent: "Return success message",
        },
      }

      const config: SelfHealingConfig = {
        maxAttempts: 3,
        enableLLMHealing: true,
        minFitnessScore: 50,
      }

      const result = await task.executeWithHealing(context, config)

      expect(result.healingAttempts).toHaveLength(0)
      expect(result.result.isEmpty).toBe(false)
      expect(result.finalCode).toBe(context.source)
    })

    it("should attempt healing when code fails", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const context: CodeContext = {
        source: "function failing() { throw new Error('fails') }",
        functionName: "failing",
        llmContext: {
          intent: "Function that should not fail",
        },
      }

      const config: SelfHealingConfig = {
        maxAttempts: 2,
        enableLLMHealing: true,
        minFitnessScore: 70,
      }

      const result = await task.executeWithHealing(context, config)

      expect(result.healingAttempts.length).toBeGreaterThan(0)
      expect(result.healingAttempts[0]?.error).toContain("error")
      expect(result.healingAttempts[0]?.healedCode).toBeDefined()
    })

    it("should respect maximum healing attempts", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const context: CodeContext = {
        source: "function alwaysFails() { throw new Error('always fails') }",
        functionName: "alwaysFails",
        llmContext: {
          intent: "Function that keeps failing",
        },
      }

      const config: SelfHealingConfig = {
        maxAttempts: 2,
        enableLLMHealing: true,
        minFitnessScore: 90,
      }

      const result = await task.executeWithHealing(context, config)

      expect(result.healingAttempts.length).toBeLessThanOrEqual(config.maxAttempts)
      expect(result.result.isEmpty).toBe(true)
    })
  })

  describe("code validation", () => {
    it("should validate healed code for safety", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const original: CodeContext = {
        source: "function safe() { return 'safe' }",
        functionName: "safe",
        llmContext: { intent: "Safe function" },
      }

      const healedCode = "function safe() { return 'healed'; eval('dangerous'); }"
      const config = CodeAwareTask.defaultConfig()

      const validation = await task.validateHealedCode(original, healedCode, config)

      expect(validation.isValid).toBe(false)
      expect(validation.riskLevel).toBe("high")
      expect(validation.issues).toContain("Healed code contains potentially dangerous eval() or Function()")
    })

    it("should accept safe healed code", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const original: CodeContext = {
        source: "function broken() { throw error }",
        functionName: "broken",
        llmContext: { intent: "Function with error" },
      }

      const healedCode = "function broken() { try { return 'fixed' } catch(e) { return 'error' } }"
      const config = CodeAwareTask.defaultConfig()

      const validation = await task.validateHealedCode(original, healedCode, config)

      expect(validation.isValid).toBe(true)
      expect(validation.riskLevel).toBe("medium") // It's longer than original, so gets medium risk
      expect(validation.issues.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe("utility functions", () => {
    it("should create code context with helper", () => {
      const context = CodeAwareTask.createCodeContext("function test() {}", "Test function", {
        filePath: "/test.ts",
        functionName: "test",
        expectedOutput: "success",
        constraints: ["must be fast"],
        dependencies: ["lodash"],
      })

      expect(context.source).toBe("function test() {}")
      expect(context.filePath).toBe("/test.ts")
      expect(context.functionName).toBe("test")
      expect(context.expectedOutput).toBe("success")
      expect(context.llmContext?.intent).toBe("Test function")
      expect(context.llmContext?.constraints).toEqual(["must be fast"])
      expect(context.llmContext?.dependencies).toEqual(["lodash"])
    })

    it("should create default configuration", () => {
      const config = CodeAwareTask.defaultConfig()

      expect(config.maxAttempts).toBe(3)
      expect(config.enableLLMHealing).toBe(true)
      expect(config.minFitnessScore).toBe(70)
      expect(config.llmConfig?.provider).toBe("openai")
      expect(config.llmConfig?.model).toBe("gpt-4")
    })

    it("should create fitness-focused configuration", () => {
      const config = CodeAwareTask.fitnessConfig(85)

      expect(config.minFitnessScore).toBe(85)
      expect(config.maxAttempts).toBe(5)
      expect(config.llmConfig?.temperature).toBe(0.0)
    })
  })

  describe("healing suggestions", () => {
    it("should generate healing suggestions for errors", async () => {
      const task = CodeAwareTask<string>({ name: "TestTask" })
      const context: CodeContext = {
        source: "function buggy(data) { return data.value }",
        functionName: "buggy",
        llmContext: {
          intent: "Extract value from data object",
        },
      }

      const config = CodeAwareTask.defaultConfig()
      const suggestions = await task.generateHealingSuggestions(
        context,
        "Cannot read property 'value' of undefined",
        config,
      )

      expect(suggestions.suggestions).toContain("Add null checks for input parameters")
      expect(suggestions.healedCode).toBeDefined()
      expect(suggestions.reasoning).toContain("The code appears to need better error handling")
    })
  })

  describe("comprehensive integration", () => {
    it("should handle complete self-healing workflow", async () => {
      const task = CodeAwareTask<string>({ name: "IntegrationTask" })

      // Create a realistic scenario
      const context: CodeContext = {
        source: `
          function processUserData(users) {
            return users.map(user => ({
              name: user.name.toUpperCase(),
              email: user.email.toLowerCase(),
              age: user.age + 1
            }))
          }
        `,
        functionName: "processUserData",
        filePath: "/src/userProcessor.ts",
        expectedOutput: [{ name: "JOHN", email: "john@example.com", age: 26 }],
        llmContext: {
          intent: "Process user data by normalizing names and emails, incrementing age",
          constraints: ["Must handle null/undefined users", "Must validate email format"],
          dependencies: ["lodash", "validator"],
          domain: "User management system",
        },
      }

      // Add custom domain-specific fitness function
      const domainFitness = CodeAwareTask.createCustomFitnessFunction("userDataProcessing", async (ctx, result) => {
        let score = 60
        const feedback: string[] = []

        if (ctx.source.includes("toUpperCase")) {
          score += 20
          feedback.push("Correctly normalizes names to uppercase")
        }

        if (ctx.source.includes("toLowerCase")) {
          score += 20
          feedback.push("Correctly normalizes emails to lowercase")
        }

        return { score: Math.min(100, score), feedback }
      })

      const config: SelfHealingConfig = {
        maxAttempts: 3,
        enableLLMHealing: true,
        minFitnessScore: 75,
        customFitnessFunctions: [domainFitness],
        llmConfig: {
          provider: "openai",
          model: "gpt-4",
          temperature: 0.1,
        },
      }

      const result = await task.executeWithHealing(context, config)

      // Verify the comprehensive result
      expect(result.fitness.score).toBeGreaterThan(0)
      expect(result.fitness.metrics).toHaveProperty("correctness")
      expect(result.fitness.metrics).toHaveProperty("performance")
      expect(result.fitness.metrics).toHaveProperty("maintainability")
      expect(result.fitness.metrics).toHaveProperty("security")
      expect(result.fitness.metrics).toHaveProperty("typeSafety")
      expect(result.finalCode).toBeDefined()
      expect(Array.isArray(result.healingAttempts)).toBe(true)
    })
  })
})
