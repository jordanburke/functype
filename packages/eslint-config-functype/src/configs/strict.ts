import recommended from "./recommended"

// ESLint 9.x Flat Config Format - Strict rules overlay
// Note: Peer dependency validation is inherited from recommended config
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
