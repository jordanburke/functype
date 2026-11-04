/** The same files as eslint-config-functype's `test-overrides`. A test in tests/configs.test.ts keeps the two equal. */
export const testFiles = ["**/*.{test,spec}.{ts,tsx,mts,cts}", "**/test/**", "**/tests/**", "**/__tests__/**"]

/** Tests call plain `T | undefined` APIs and assert on thrown errors. */
export default {
  "functype/prefer-option": "off",
  "functype/prefer-either": "off",
  "functype/prefer-try": "off",
}
