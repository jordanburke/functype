---
"functype": patch
"functype-os": patch
"functype-log": patch
"functype-react": patch
"functype-mcp-server": patch
"eslint-config-functype": patch
"eslint-plugin-functype": patch
---

Family-cadence patch release.

- **functype** — `src/cli/data.ts` interface lists are now source-derived. A new parser (`scripts/parse-interfaces.ts`) walks each type's `extends` clause and recursively expands wrapper interfaces (`Functype`/`FunctypeBase`/`FunctypeSum`/`FunctypeCollection`/`AsyncMonad`/`Monad`/`Applicative`); `scripts/generate-interfaces.ts` writes `src/cli/interfaces.generated.ts`; a `test/cli/data-sync.spec.ts` superset-check fails CI if `TYPES[name].interfaces` ever drops anything in the source extends chain. Effect: `Doable`, `Promisable`, `Reshapeable`, `Applicative`, `AsyncMonad` now correctly surface for `Option`, `Either`, `Try`, `List`, `Obj`, `Lazy`, `Task` in `npx functype <Type>` and `functype-mcp-server`'s `search_docs`. Closes a discoverability gap that hid `Doable` for the entire monadic family.
