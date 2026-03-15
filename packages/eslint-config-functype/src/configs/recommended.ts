import {
  createValidationError,
  shouldValidateDependencies,
  validatePeerDependencies,
} from "../utils/dependency-validator"

// Validate peer dependencies on config load
if (shouldValidateDependencies()) {
  const result = validatePeerDependencies()
  if (!result.isValid) {
    throw createValidationError(result)
  }

  // Log warnings for missing optional dependencies
  if (result.warnings.length > 0) {
    console.warn("\n⚠️  eslint-config-functype warnings:")
    result.warnings.forEach((warning) => console.warn(`   ${warning}`))
    console.warn("")
  }
}

// ESLint 9.x Flat Config Format
// Complete functional TypeScript config with formatting and import organization
export default {
  name: "functype/recommended",
  rules: {
    // Core JavaScript immutability
    "prefer-const": "error",
    "no-var": "error",
    "no-throw-literal": "error",
    "no-mixed-spaces-and-tabs": "error",
    "no-extra-semi": "error",
    "object-shorthand": "error",
    "prefer-template": "error",
    "prefer-destructuring": [
      "error",
      {
        array: false,
        object: true,
      },
    ],

    // TypeScript functional patterns (when @typescript-eslint is available)
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_", // Only underscore-prefixed parameters
        varsIgnorePattern: "^(_|[A-Z]$)", // Allow underscore-prefixed vars and single uppercase letters (interface generics)
        caughtErrors: "all", // Require using catch block errors or prefix with _
        caughtErrorsIgnorePattern: "^_", // Allow _error, _e, etc. in catch blocks
        destructuredArrayIgnorePattern: "^_",
        ignoreRestSiblings: true,
        args: "after-used",
      },
    ],
    "@typescript-eslint/no-unused-expressions": [
      "error",
      {
        allowShortCircuit: true,
        allowTernary: true,
      },
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/require-await": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/no-unnecessary-condition": "warn",
    // Relax strict-boolean-expressions for functional library patterns
    // This rule is valuable for applications but creates excessive noise in a functional library where:
    // 1. Optional chaining patterns like `if (options?.prop)` are idiomatic and safe
    // 2. String/object truthiness checks are common and intentional (e.g., `if (message)`)
    // 3. The functional design already provides safety through Option/Either patterns
    // 4. Library code often needs flexibility for performance and interoperability
    "@typescript-eslint/strict-boolean-expressions": [
      "warn",
      {
        allowString: true, // Allow `if (str)` patterns
        allowNumber: true, // Allow `if (num)` patterns
        allowNullableObject: true, // Allow `if (obj?.prop)` patterns
        allowNullableBoolean: true, // Allow `if (bool)` where bool might be null/undefined
        allowNullableString: true, // Allow `if (str)` where str might be null/undefined
        allowNullableNumber: true, // Allow `if (num)` where num might be null/undefined
        allowAny: true, // Allow `if (value)` where value is any type
      },
    ],

    // Functional programming rules (when eslint-plugin-functional is available)
    "functional/no-let": "error",
    "functional/immutable-data": "warn",
    "functional/no-loop-statements": "off", // Start disabled, can enable later
    "functional/prefer-immutable-types": "off",
    "functional/no-mixed-types": "off",
    "functional/functional-parameters": "off",
    "functional/no-throw-statements": ["warn", { allowToRejectPromises: true }],
    "functional/no-try-statements": ["warn", { allowCatch: true }],

    // Allow some flexibility
    "functional/no-conditional-statements": "off",
    "functional/no-expression-statements": "off",
    "functional/no-return-void": "off",

    // Code formatting (when eslint-plugin-prettier is available)
    "prettier/prettier": [
      "error",
      {},
      {
        usePrettierrc: true,
      },
    ],

    // Import organization (when eslint-plugin-simple-import-sort is available)
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
  },
}
