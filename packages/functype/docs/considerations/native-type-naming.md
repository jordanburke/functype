# Native Type Naming Strategies

## Problem Statement

How can functype prevent confusion between its functional `Set<A>` and `Map<K,V>` types and JavaScript's native `Set` and `Map`?

**Concerns:**

1. Users accidentally using `new Set()` instead of functype's `Set()` constructor
2. TypeScript type conflicts when both are used in the same file
3. Documentation clarity about differences
4. Internal code clarity distinguishing native vs functional types

## Current Implementation

Functype uses a **two-layer approach** that already prevents most confusion:

### Internal Layer (Shim Pattern)

```typescript
// src/map/shim.ts
export type ESMapType<K, V> = Map<K, V>
export const ESMap = Map

// src/set/shim.ts
export type ESSetType<T> = Set<T>
export const ESSet = Set
```

### External API

Users import distinct functional interfaces:

```typescript
import { Set, Map } from "functype"

// These are functional types, not wrappers of natives
const set = Set([1, 2, 3]) // functype Set<number>
const map = Map([[k, v]]) // functype Map<K, V>
```

**Why This Works:**

- ✅ No shadowing at user level (functype exports different names)
- ✅ Internal clarity (`ESMap`/`ESSet` = native, `Map`/`Set` = functional)
- ✅ Zero runtime overhead
- ✅ No documentation burden

## Research: Other Libraries

### fp-ts (TypeScript FP Library)

**Approach:** Module aliasing

```typescript
// Recommended pattern
import * as M from "fp-ts/Map"
import * as S from "fp-ts/Set"

const myMap = M.empty<string, number>()
const mySet = S.empty<string>()
```

**Community Discussion:**

- GitHub Issue #1415: "Naming convention for qualified imports in the fp-ts eco system"
- Standard convention but requires developer discipline

**Trade-offs:**

- ✅ Clean, minimal code impact
- ✅ Standard pattern across fp-ts ecosystem
- ❌ Low discoverability for newcomers
- ❌ Requires consistent discipline

### Immutable.js

**Approach:** Same names as native types (causes problems)

```typescript
// Problem: Shadows native types
import { Map, Set } from "immutable"

// Forces workarounds:
import { Map as ImmMap, Set as ImmSet } from "immutable"
```

**Community Issues:**

- GitHub Issue #683: "Using Immutable.js's Maps with TypeScript"
- Frequent source of bugs and confusion
- Inconsistent patterns across codebases

**Trade-offs:**

- ❌ Creates confusion and shadowing
- ❌ Poor developer experience
- ❌ Requires manual aliasing
- ✅ Short names when used alone

### Haskell (containers library)

**Approach:** Qualified imports (language feature)

```haskell
import qualified Data.Map as Map
import qualified Data.Set as Set

myMap = Map.empty
mySet = Set.insert 1 Set.empty
```

**Why It Works in Haskell:**

- Language requires module qualification
- No conflict possible with qualified imports

**Not Applicable to TypeScript:**

- ES6 imports don't have built-in qualification syntax
- Would require verbose namespace usage

### PureScript

**Approach:** Similar to Haskell

```purescript
import Data.Map as Map
import Data.Set as Set
```

**Trade-offs:**

- ✅ Eliminates shadowing completely
- ✅ Standard in functional languages
- ❌ More verbose than ES6 default imports
- ❌ Less idiomatic for TypeScript

### Elm

**Approach:** Alternative naming (`Dict` instead of `Map`)

```elm
import Dict

myDict = Dict.empty
mySet = Set.empty
```

**Rationale:**

- Beginner-friendly (zero confusion)
- Makes purpose explicit ("Dictionary")

**Trade-offs:**

- ✅ Perfect clarity, no conflicts
- ✅ Beginner-friendly
- ❌ Breaks FP language conventions
- ❌ Cognitive load for polyglot developers

### Ramda

**Current Status:** Limited Set/Map support

- GitHub Issue #2779: "What about Map support as a functor?"
- Discussing whether to add dedicated Map/Set functors
- No naming conflict decisions yet

## Comparison of Approaches

| Strategy                        | Developer Ergonomics | Discoverability | Verbosity | Consistency | IDE Support | Conflicts |
| ------------------------------- | :------------------: | :-------------: | :-------: | :---------: | :---------: | :-------: |
| **ES Prefix (functype)**        |         High         |      High       |    Low    |    High     |    High     |   None    |
| **Module Aliasing (fp-ts)**     |        Medium        |       Low       |    Low    |    High     |   Medium    |  None\*   |
| **Same Names (Immutable.js)**   |         Low          |      High       |    Low    |     Low     |    High     |   High    |
| **Qualified Imports (Haskell)** |         Low          |      High       |   High    |    High     |    High     |   None    |
| **Alternative Names (Elm)**     |         High         |    Very High    |    Low    |     Low     |  Very High  |   None    |

\* Assuming users follow conventions correctly

## Alternatives Considered

### 1. Underscore Suffix

```typescript
import { Map_, Set_ } from "functype"

const myMap = Map_.empty<string, number>()
```

**Trade-offs:**

- ✅ Explicit differentiation
- ✅ Solves shadowing at import
- ❌ Visual noise
- ❌ Not idiomatic TypeScript

### 2. Prefix Alternative

```typescript
// Instead of ESMap/ESSet, use FMap/FSet for functype
import { FMap, FSet } from "functype"
```

**Trade-offs:**

- ✅ Shorter than "functype"
- ❌ Less clear than full names
- ❌ "F" prefix meaning not obvious

### 3. Namespace Wrapper

```typescript
import { functype } from "functype"

const myMap = functype.Map([...])
const mySet = functype.Set([...])
```

**Trade-offs:**

- ✅ No shadowing possible
- ✅ Clear origin
- ❌ Verbose for every usage
- ❌ Breaks tree-shaking

### 4. Type-Only Imports

```typescript
import type { Map, Set } from "functype"
import { Map as FMap, Set as FSet } from "functype"
```

**Trade-offs:**

- ✅ Types and values separate
- ✅ Explicit distinction
- ❌ Confusing for users
- ❌ More import lines

## Community Standards

JavaScript/TypeScript community consensus:

| Pattern                 |  Recommendation  | Notes                 |
| ----------------------- | :--------------: | --------------------- |
| Prototype extension     |     ❌ Avoid     | Global pollution      |
| Module aliasing         |  ✅ Acceptable   | Requires discipline   |
| ES Prefix for internals |  ✅ Recommended  | Clear intent          |
| Same names as natives   |  ❌ Discouraged  | Causes confusion      |
| Namespace wrapping      | ⚠️ Use sparingly | Can hurt tree-shaking |

## Recommendations

### Current Approach: Keep ES Prefix Pattern ✅

**Rationale:**

1. **Already solves the problem** - Users never see native types
2. **Internal clarity** - Developers know `ESMap` = native, `Map` = functional
3. **Zero user burden** - No import gymnastics required
4. **Type safety** - TypeScript catches misuse
5. **Follows best practices** - Clean separation of concerns

**No action needed** - Current design is sound.

### Documentation Enhancements

Add examples showing the difference:

```typescript
// ✅ Correct - functype Set
import { Set } from "functype"
const mySet = Set([1, 2, 3]) // Constructor function

// ❌ Wrong - native Set
const nativeSet = new Set([1, 2, 3]) // Will cause type errors if used with functype
```

### If Additional Safety Needed

**Option 1: TypeScript Strict Mode Enforcement**

Ensure functype types are structurally incompatible with natives so TypeScript catches errors:

```typescript
// This should fail type checking
const funcSet: Set<number> = new Set([1, 2, 3]) // Type error!
```

**Option 2: ESLint Rule (Advanced)**

Create optional ESLint rule for projects that want to prevent native Set/Map usage:

```javascript
// .eslintrc.js
rules: {
  "functype/no-native-collections": "error"
}
```

**Option 3: Runtime Type Guard**

Add helper for defensive checks:

```typescript
import { isFunctypeSet, isFunctypeMap } from "functype/guards"

function process(set: unknown) {
  if (!isFunctypeSet(set)) {
    throw new TypeError("Expected functype Set, got native Set")
  }
  // ...
}
```

## Key Findings

1. **The real problem isn't library naming** - It's how users import and use types
2. **Functype's design is already sound** - The ES prefix pattern + distinct type names prevent shadowing
3. **fp-ts got it right** - Module aliasing works but requires discipline
4. **Prototype extensions are problematic** - Avoid at library level (see [array-list-integration.md](./array-list-integration.md))
5. **Documentation matters most** - Clear examples prevent confusion better than clever naming

## References

### External Resources

- [fp-ts GitHub Issue #1415](https://github.com/gcanti/fp-ts/issues/1415) - Naming conventions discussion
- [Immutable.js GitHub Issue #683](https://github.com/immutable-js/immutable-js/issues/683) - TypeScript Map confusion
- [Ramda GitHub Issue #2779](https://github.com/ramda/ramda/issues/2779) - Map functor support
- [MDN: Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) - Native Map documentation
- [MDN: Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) - Native Set documentation

### Internal Documentation

- [src/map/shim.ts](../../src/map/shim.ts) - Native Map shim implementation
- [src/set/shim.ts](../../src/set/shim.ts) - Native Set shim implementation
- [Array-List Integration Considerations](./array-list-integration.md) - Related design discussion

## Conclusion

**No changes recommended.** Functype's current ES prefix pattern for internal shimming combined with distinct functional type exports already prevents user confusion while maintaining clean, ergonomic APIs. The two-layer approach is a proven pattern that balances internal clarity with external simplicity.
