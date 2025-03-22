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

## API Design Pattern

- **Scala-inspired Approach**: Use a hybrid of functional and object-oriented styles:
  - Constructor functions that return objects with methods (e.g., `Option(value)`)
  - Object methods for operations (e.g., `option.map()`, `list.filter()`)
  - Companion functions for additional utilities (e.g., `Option.from()`, `Option.none()`)
- **Consistency**: All modules should follow this pattern to maintain API consistency
- **Companion Pattern**: Use the `Companion` utility to create function-objects where appropriate
