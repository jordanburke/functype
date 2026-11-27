import recommended from "./recommended"

// ESLint flat config: recommended, with stricter rules. Its files, parser and plugins are recommended's.
export default {
  ...recommended,
  name: "functype/strict",
  rules: {
    ...recommended.rules,

    // Stricter TypeScript rules (non-type-aware)
    "@typescript-eslint/explicit-function-return-type": "error",
    "@typescript-eslint/no-non-null-assertion": "error",
    "@typescript-eslint/strict-boolean-expressions": "error", // Default strict
  },
}
