import { CodeAwareTask, type CodeContext, type SelfHealingConfig } from "@/core/task/CodeAwareTask"

/**
 * Example 1: Basic code fitness evaluation
 */
export async function basicFitnessExample() {
  const task = CodeAwareTask<string>({ name: "FitnessDemo" })

  const goodCode: CodeContext = {
    source: `
      function calculateDiscount(price: number, membershipLevel: string): number {
        if (typeof price !== 'number' || price < 0) {
          throw new Error('Invalid price')
        }
        
        const discounts = {
          premium: 0.2,
          regular: 0.1,
          basic: 0.05
        }
        
        return price * (discounts[membershipLevel] ?? 0)
      }
    `,
    functionName: "calculateDiscount",
    filePath: "/src/pricing.ts",
    llmContext: {
      intent: "Calculate discount based on price and membership level",
      constraints: ["Must validate inputs", "Must handle unknown membership levels"],
      domain: "E-commerce pricing system",
    },
  }

  const fitness = await task.evaluateFitness(goodCode)

  console.log("Good Code Fitness:")
  console.log(`Overall Score: ${fitness.score}/100`)
  console.log(`Type Safety: ${fitness.metrics.typeSafety}/100`)
  console.log(`Maintainability: ${fitness.metrics.maintainability}/100`)
  console.log(`Security: ${fitness.metrics.security}/100`)
  console.log("Feedback:", fitness.feedback)

  return fitness
}

/**
 * Example 2: Self-healing execution with problematic code
 */
export async function selfHealingExample() {
  const task = CodeAwareTask<any>({ name: "SelfHealingDemo" })

  const problematicCode: CodeContext = {
    source: `
      function processUsers(users) {
        return users.map(user => user.name.toUpperCase())
      }
    `,
    functionName: "processUsers",
    filePath: "/src/userProcessor.ts",
    expectedOutput: ["JOHN", "JANE"],
    llmContext: {
      intent: "Process users array to get uppercase names",
      constraints: ["Must handle null/undefined users", "Must handle missing name property"],
      dependencies: ["lodash"],
    },
  }

  const config: SelfHealingConfig = {
    maxAttempts: 3,
    enableLLMHealing: true,
    minFitnessScore: 75,
    llmConfig: {
      provider: "openai",
      model: "gpt-4",
      temperature: 0.1,
    },
  }

  const result = await task.executeWithHealing(problematicCode, config)

  console.log("Self-Healing Results:")
  console.log(`Success: ${!result.result.isEmpty}`)
  console.log(`Final Fitness Score: ${result.fitness.score}/100`)
  console.log(`Healing Attempts: ${result.healingAttempts.length}`)

  result.healingAttempts.forEach((attempt, index) => {
    console.log(`Attempt ${index + 1}:`)
    console.log(`  Error: ${attempt.error}`)
    console.log(`  Success: ${attempt.success}`)
    if (attempt.healedCode) {
      console.log(`  Healed Code Length: ${attempt.healedCode.length} chars`)
    }
  })

  console.log("Final Code:")
  console.log(result.finalCode)

  return result
}

/**
 * Example 3: Custom fitness functions for domain-specific evaluation
 */
export async function customFitnessExample() {
  const task = CodeAwareTask<string>({ name: "CustomFitnessDemo" })

  // Create domain-specific fitness functions
  const apiResponseFitness = CodeAwareTask.createCustomFitnessFunction("apiResponse", async (context, result) => {
    let score = 50
    const feedback: string[] = []

    // Check for proper error handling in API code
    if (context.source.includes("try") && context.source.includes("catch")) {
      score += 20
      feedback.push("Includes proper error handling")
    }

    // Check for status code handling
    if (context.source.includes("status") || context.source.includes("response")) {
      score += 15
      feedback.push("Handles HTTP responses appropriately")
    }

    // Check for async/await usage
    if (context.source.includes("async") && context.source.includes("await")) {
      score += 15
      feedback.push("Uses modern async/await pattern")
    }

    return {
      score: Math.min(100, score),
      feedback,
      suggestions: score < 80 ? ["Consider adding more robust error handling"] : [],
    }
  })

  const performanceFitness = CodeAwareTask.createCustomFitnessFunction("performance", async (context) => {
    let score = 60
    const feedback: string[] = []

    // Check for potential performance issues
    const hasNestedLoops = (context.source.match(/for\s*\(/g) || []).length > 1
    if (hasNestedLoops) {
      score -= 20
      feedback.push("Contains nested loops - potential O(n²) complexity")
    }

    // Check for proper async handling
    if (context.source.includes("Promise.all")) {
      score += 20
      feedback.push("Uses Promise.all for concurrent operations")
    }

    // Check for memoization or caching
    if (context.source.includes("cache") || context.source.includes("memo")) {
      score += 15
      feedback.push("Implements caching for better performance")
    }

    return {
      score: Math.min(100, Math.max(0, score)),
      feedback,
      suggestions: score < 70 ? ["Consider optimizing algorithm complexity"] : [],
    }
  })

  const apiCode: CodeContext = {
    source: `
      async function fetchUserData(userId: string): Promise<User> {
        try {
          const response = await fetch(\`/api/users/\${userId}\`)
          
          if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`)
          }
          
          const userData = await response.json()
          return userData as User
        } catch (error) {
          console.error('Failed to fetch user data:', error)
          throw new Error(\`User fetch failed: \${error.message}\`)
        }
      }
    `,
    functionName: "fetchUserData",
    filePath: "/src/api/users.ts",
    llmContext: {
      intent: "Fetch user data from API with proper error handling",
      constraints: ["Must handle HTTP errors", "Must validate response"],
      dependencies: ["fetch API"],
      domain: "User management API",
    },
  }

  const fitness = await task.evaluateFitness(apiCode, undefined, [apiResponseFitness, performanceFitness])

  console.log("Custom Fitness Evaluation:")
  console.log(`Overall Score: ${fitness.score}/100`)
  console.log("All Metrics:", fitness.metrics)
  console.log("Feedback:", fitness.feedback)
  console.log("Suggestions:", fitness.suggestions)

  return fitness
}

/**
 * Example 4: Real-world scenario with comprehensive healing
 */
export async function realWorldScenario() {
  const task = CodeAwareTask<any>({ name: "RealWorldDemo" })

  // Simulate a real data processing function that has issues
  const realWorldCode: CodeContext = {
    source: `
      function processOrderData(orders) {
        const processed = orders.map(order => {
          const total = order.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity)
          }, 0)
          
          return {
            orderId: order.id,
            customerName: order.customer.name,
            total: total,
            status: order.status,
            processedAt: new Date().toISOString()
          }
        })
        
        return processed.sort((a, b) => b.total - a.total)
      }
    `,
    functionName: "processOrderData",
    filePath: "/src/orders/processor.ts",
    inputParams: {
      orders: [
        {
          id: "123",
          customer: { name: "John Doe" },
          items: [{ price: 10, quantity: 2 }],
          status: "pending",
        },
      ],
    },
    expectedOutput: [
      {
        orderId: "123",
        customerName: "John Doe",
        total: 20,
        status: "pending",
        processedAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    llmContext: {
      intent: "Process order data to calculate totals and format for display",
      constraints: [
        "Must handle missing customer data",
        "Must handle empty items arrays",
        "Must validate price and quantity",
        "Must sort by total descending",
      ],
      dependencies: ["date-fns"],
      domain: "E-commerce order management",
    },
  }

  // Create business-specific fitness function
  const businessLogicFitness = CodeAwareTask.createCustomFitnessFunction("businessLogic", async (context, result) => {
    let score = 40
    const feedback: string[] = []

    // Check for null/undefined handling
    if (context.source.includes("&&") || context.source.includes("?.")) {
      score += 20
      feedback.push("Includes null/undefined safety checks")
    } else {
      feedback.push("Missing null/undefined safety checks")
    }

    // Check for input validation
    if (context.source.includes("Array.isArray") || context.source.includes("typeof")) {
      score += 15
      feedback.push("Includes input validation")
    }

    // Check for proper error handling
    if (context.source.includes("try") || context.source.includes("throw")) {
      score += 15
      feedback.push("Includes error handling")
    }

    // Check for business rule implementation (sorting)
    if (context.source.includes("sort")) {
      score += 10
      feedback.push("Implements required sorting logic")
    }

    return {
      score: Math.min(100, score),
      feedback,
      suggestions:
        score < 80
          ? [
              "Add input validation for order structure",
              "Add null checks for customer and items",
              "Consider using optional chaining (?.) for safety",
            ]
          : [],
    }
  })

  const config: SelfHealingConfig = {
    maxAttempts: 4,
    enableLLMHealing: true,
    minFitnessScore: 80,
    customFitnessFunctions: [businessLogicFitness],
    llmConfig: {
      provider: "openai",
      model: "gpt-4",
      temperature: 0.05, // Very low for consistent results
    },
  }

  console.log("Starting real-world scenario...")
  console.log("Initial code fitness evaluation...")

  const initialFitness = await task.evaluateFitness(realWorldCode)
  console.log(`Initial fitness score: ${initialFitness.score}/100`)
  console.log(
    "Initial issues:",
    initialFitness.feedback.filter((f) => f.includes("Missing") || f.includes("Consider")),
  )

  console.log("\nExecuting with self-healing...")
  const result = await task.executeWithHealing(realWorldCode, config)

  console.log("\nFinal Results:")
  console.log(`Success: ${!result.result.isEmpty}`)
  console.log(`Final Fitness Score: ${result.fitness.score}/100`)
  console.log(`Improvement: +${result.fitness.score - initialFitness.score} points`)
  console.log(`Healing Attempts: ${result.healingAttempts.length}`)

  if (result.healingAttempts.length > 0) {
    console.log("\nHealing Journey:")
    result.healingAttempts.forEach((attempt, index) => {
      console.log(`\nAttempt ${index + 1}:`)
      console.log(`  Trigger: ${attempt.error}`)
      console.log(`  Fitness Score: ${attempt.fitnessScore || "N/A"}`)
      console.log(`  Success: ${attempt.success}`)
      if (attempt.reasoning) {
        console.log(`  AI Reasoning: ${attempt.reasoning.slice(0, 200)}...`)
      }
    })
  }

  console.log("\nFinal Code Quality Metrics:")
  Object.entries(result.fitness.metrics).forEach(([metric, score]) => {
    console.log(`  ${metric}: ${score}/100`)
  })

  if (result.fitness.suggestions.length > 0) {
    console.log("\nRemaining Suggestions:")
    result.fitness.suggestions.forEach((suggestion) => {
      console.log(`  - ${suggestion}`)
    })
  }

  return result
}

/**
 * Example 5: Security-focused fitness evaluation
 */
export async function securityFitnessExample() {
  const task = CodeAwareTask<string>({ name: "SecurityDemo" })

  const insecureCode: CodeContext = {
    source: `
      function processUserInput(input) {
        // Dangerous: using eval
        const result = eval(input.expression)
        
        // Dangerous: XSS vulnerability
        document.getElementById('output').innerHTML = input.html
        
        // Dangerous: command injection risk
        const { exec } = require('child_process')
        exec(input.command, (error, stdout) => {
          console.log(stdout)
        })
        
        return result
      }
    `,
    functionName: "processUserInput",
    filePath: "/src/dangerous.ts",
    llmContext: {
      intent: "Process user input (INSECURE VERSION FOR TESTING)",
      constraints: ["Should never use eval", "Should sanitize HTML", "Should never execute user commands"],
      domain: "Security testing",
    },
  }

  const securityFitness = CodeAwareTask.createCustomFitnessFunction("security", async (context) => {
    let score = 100
    const feedback: string[] = []
    const suggestions: string[] = []

    // Check for dangerous patterns
    if (context.source.includes("eval(")) {
      score -= 40
      feedback.push("CRITICAL: Uses eval() - major security risk")
      suggestions.push("Replace eval() with safe JSON.parse() or custom parser")
    }

    if (context.source.includes("innerHTML")) {
      score -= 25
      feedback.push("HIGH: Uses innerHTML - XSS vulnerability")
      suggestions.push("Use textContent or sanitize HTML with DOMPurify")
    }

    if (context.source.includes("exec(") || context.source.includes("spawn(")) {
      score -= 35
      feedback.push("CRITICAL: Executes system commands - command injection risk")
      suggestions.push("Never execute user-provided commands")
    }

    // Check for good security practices
    if (context.source.includes("sanitize") || context.source.includes("escape")) {
      score += 10
      feedback.push("GOOD: Includes sanitization")
    }

    if (context.source.includes("validate") || context.source.includes("whitelist")) {
      score += 10
      feedback.push("GOOD: Includes input validation")
    }

    return {
      score: Math.max(0, score),
      feedback,
      suggestions,
    }
  })

  const fitness = await task.evaluateFitness(insecureCode, undefined, [securityFitness])

  console.log("Security Fitness Evaluation:")
  console.log(`Security Score: ${fitness.metrics.security}/100`)
  console.log(`Overall Score: ${fitness.score}/100`)
  console.log("\nSecurity Issues Found:")
  fitness.feedback.forEach((issue) => {
    if (issue.includes("CRITICAL") || issue.includes("HIGH")) {
      console.log(`  🚨 ${issue}`)
    } else if (issue.includes("GOOD")) {
      console.log(`  ✅ ${issue}`)
    } else {
      console.log(`  ℹ️  ${issue}`)
    }
  })

  console.log("\nSecurity Recommendations:")
  fitness.suggestions.forEach((suggestion) => {
    console.log(`  🔧 ${suggestion}`)
  })

  return fitness
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log("=== CodeAwareTask Examples ===\n")

  try {
    console.log("1. Basic Fitness Evaluation")
    console.log("=".repeat(50))
    await basicFitnessExample()

    console.log("\n\n2. Self-Healing Execution")
    console.log("=".repeat(50))
    await selfHealingExample()

    console.log("\n\n3. Custom Fitness Functions")
    console.log("=".repeat(50))
    await customFitnessExample()

    console.log("\n\n4. Real-World Scenario")
    console.log("=".repeat(50))
    await realWorldScenario()

    console.log("\n\n5. Security-Focused Evaluation")
    console.log("=".repeat(50))
    await securityFitnessExample()

    console.log("\n\n=== All Examples Complete ===")
  } catch (error) {
    console.error("Error running examples:", error)
  }
}

// Export for individual testing
// (The functions are already exported above, so we don't need to re-export them)
