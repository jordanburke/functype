# Adding Methods to Existing Data Structures

Checklist for adding new methods to existing functype types (List, Set, Map, Option, etc.).

## Full Checklist

### 1. Interface Updates

- [ ] If the method belongs on a **shared interface** (e.g., `CollectionOps` in `src/typeclass/ContainerOps.ts`), add it there first
- [ ] If type-specific, add directly to the type's interface (e.g., `List<A>` in `src/list/List.ts`)
- [ ] Override return types in type-specific interfaces when the shared interface returns a generic type

### 2. Implementation

- [ ] Implement in **ALL types** that extend the modified interface
  - For `CollectionOps`: List, Set, and any future collections
  - For type-specific: just that type
- [ ] Add JSDoc comments with `@example` tags in the source

### 3. Testing

- [ ] Add tests to existing test file (e.g., `test/list/list.spec.ts`)
- [ ] Cover: basic usage, edge cases (empty collections), type inference
- [ ] Run `pnpm vitest run test/<type>.spec.ts` to verify

### 4. CLI Updates

- [ ] Run `pnpm extract:interfaces` to regenerate `src/cli/full-interfaces.ts`
- [ ] Add method to appropriate category in `src/cli/data.ts`
  - `transform`: methods that return the same container type
  - `extract`: methods that pull values out
  - `check`: boolean predicates
  - `other`: methods that return different structures (e.g., `groupBy` returns `Map`)

### 5. Documentation

- [ ] Update `docs/FUNCTYPE_FEATURE_MATRIX.md` if interface support changes
- [ ] Run `pnpm docs:sync` to sync feature matrix to landing site
- [ ] Update `landing/src/content/<type>.md` with examples
- [ ] Update `.claude/skills/functype/references/quick-reference.md`
- [ ] Update `.claude/skills/functype/references/common-patterns.md` if workarounds become built-in

### 6. Validation

- [ ] Run `pnpm validate` (format + lint + test + build)
- [ ] Run `npx functype` to verify CLI output includes new methods

## Property vs Method Convention

- **Properties** (no parentheses): `head`, `tail`, `init`, `last`, `headOption`, `lastOption`, `isEmpty`, `size`
- **Methods** (with parentheses): `take(n)`, `filter(p)`, `map(f)`, `sorted()`, `reverse()`

General rule: zero-arg accessors that don't compute new collections are properties. Operations that transform or require arguments are methods.

## Shared Interface Methods

When adding to `CollectionOps` (or similar shared interface):

1. Add the method signature to the interface in `src/typeclass/ContainerOps.ts`
2. Implement in `List.ts` with `List<A>` return type override
3. Implement in `Set.ts` with `Set<A>` return type override
4. Check if `LazyList` should also get the method (it has its own interface)

## Example: Adding `reverse()` to List

```typescript
// 1. In src/typeclass/ContainerOps.ts (if shared)
export interface CollectionOps<A> {
  reverse: () => CollectionOps<A>
}

// 2. In src/list/List.ts (override return type)
export interface List<A> extends FunctypeCollection<A, "List"> {
  reverse: () => List<A>
}

// 3. In List implementation
reverse: () => ListObject([...array].reverse()),

// 4. In src/set/Set.ts (if on shared interface)
reverse: () => SetObject([...items].reverse()),

// 5. Test in test/list/list.spec.ts
it("should reverse the list", () => {
  expect(List([1, 2, 3]).reverse().toArray()).toEqual([3, 2, 1])
})
```
