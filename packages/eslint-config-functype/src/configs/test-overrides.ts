export default {
  name: "functype/test-overrides",
  files: ["**/*.{test,spec}.{ts,tsx,mts,cts}", "**/test/**", "**/tests/**", "**/__tests__/**"],
  rules: {
    // Tests stub async contracts with async functions that never await.
    "@typescript-eslint/require-await": "off",
    // Tests probe values the types say are present: `?.` and `??` in assertions.
    "@typescript-eslint/no-unnecessary-condition": "off",
  },
}
