// `eslint-plugin-functype` is an ESM-only sibling workspace package whose emitted types live in its
// `dist/`. During `turbo run validate` that `dist/` is rebuilt with `clean: true`, so it can briefly
// vanish and race our typecheck (intermittent `TS2307: Cannot find module 'eslint-plugin-functype'`).
//
// We only consume the default export as an opaque ESLint plugin object (registered under the
// `functype` namespace and cast to `ESLint.Plugin` at the use site), so this minimal ambient
// declaration decouples our typecheck from the sibling's build artifacts. When the real `dist` types
// are present TypeScript still resolves them; this only provides a stable fallback.
declare module "eslint-plugin-functype" {
  const plugin: unknown
  export default plugin
}
