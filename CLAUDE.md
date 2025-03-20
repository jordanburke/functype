# CLAUDE.md - Project Guidelines for functype

## Build & Test Commands
- Build: `pnpm build:prod` (production) or `pnpm build:dev` (development)
- Watch mode: `pnpm build:watch`
- Lint: `pnpm lint` (format and fix) or `pnpm lint:fix` (fix only)
- Test all: `pnpm test`
- Test single file: `pnpm vitest run test/path/to/file.spec.ts`
- Test watch mode: `pnpm test:watch`
- Test with UI: `pnpm test:ui`
- Documentation: `pnpm docs` (generate docs)

## Code Style
- **Imports**: Use type-only imports when possible. Organized with simple-import-sort.
- **Types**: Use `Type` from functor. Prefer explicit type annotations.
- **Naming**: Use PascalCase for classes/types, camelCase for functions/variables.
- **Error Handling**: Use Option/Either/Try patterns for error handling.
- **Functional Style**: Follow functional paradigms (immutability, pure functions).
- **Pattern**: Constructor functions return objects with methods, not classes.
- **Paths**: Use absolute imports with @ alias (`import from "@/path"`).
- **Testing**: Use Vitest with describe/it pattern. Test edge cases thoroughly.