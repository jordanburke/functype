export default {
  name: "functype/test-overrides",
  files: ["**/*.test.ts", "**/*.spec.ts", "**/test/**", "**/tests/**", "**/__tests__/**"],
  rules: {
    "functional/no-let": "off",
    "functional/immutable-data": "off",
    "functional/no-throw-statements": "off",
    "functional/no-try-statements": "off",
  },
}
