# Functype Feature Matrix

This matrix shows which interfaces are supported by each data structure in the functype library.

## Legend

- ✓ Full support
- ◐ Partial support (custom implementation)
- ✗ Not supported
- ← Inherited from parent interface

## Core Interfaces

| Data Structure     | Functor | Applicative | Monad | AsyncMonad | Foldable | Matchable | Serializable | Traversable | Extractable | Unsafe | Pipe | Collection | ContainerOps | CollectionOps |
| ------------------ | :-----: | :---------: | :---: | :--------: | :------: | :-------: | :----------: | :---------: | :---------: | :----: | :--: | :--------: | :----------: | :-----------: |
| **Option<T>**      |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✓     |      ✓       |      ✓      |      ✓      |   ←    |  ✓   |     ✗      |      ✓       |       ✗       |
| **Either<L,R>**    |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✓      |   ←    |  ✗   |     ✗      |      ✓       |       ✗       |
| **Try<T>**         |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✓      |   ←    |  ✓   |     ✗      |      ✓       |       ✗       |
| **IO<R,E,A>**      |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✓     |      ✗       |      ✗      |      ✗      |   ✗    |  ✓   |     ✗      |      ✗       |       ✗       |
| **TaskOutcome<T>** |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✓      |   ←    |  ✓   |     ✗      |      ✓       |       ✗       |
| **List<A>**        |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✗      |   ✗    |  ✓   |     ✓      |      ✓       |       ✓       |
| **Set<A>**         |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✗      |   ✗    |  ✓   |     ✓      |      ✓       |       ✓       |
| **Map<K,V>**       |    ◐    |      ✗      |   ✗   |     ✗      |    ✓     |     ✗     |      ✓       |      ◐      |      ✗      |   ✗    |  ✓   |     ✓      |      ✗       |       ✗       |
| **Lazy<T>**        |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✓      |   ←    |  ✓   |     ✗      |      ✓       |       ✗       |
| **Stack<A>**       |    ✗    |      ✗      |   ✗   |     ✗      |    ✓     |     ✓     |      ✓       |      ✓      |      ✗      |   ✗    |  ✓   |     ✗      |      ✗       |       ✗       |
| **LazyList<A>**    |    ◐    |      ✗      |   ◐   |     ✗      |    ✓     |     ✗     |      ✓       |      ✗      |      ✗      |   ✗    |  ✓   |     ✗      |      ✗       |       ✗       |
| **Tuple<T[]>**     |    ◐    |      ✗      |   ◐   |     ✗      |    ✓     |     ✗     |      ✓       |      ✗      |      ✗      |   ✗    |  ✓   |     ✗      |      ✗       |       ✗       |

## Additional Properties

| Data Structure     | Typeable | Valuable | Iterable | PromiseLike | Do-notation | Reshapeable | Promisable |
| ------------------ | :------: | :------: | :------: | :---------: | :---------: | :---------: | :--------: |
| **Option<T>**      |    ✓     |    ✗     |    ✗     |      ✗      |      ✓      |      ✓      |     ✓      |
| **Either<L,R>**    |    ✓     |    ✗     |    ✗     |      ✓      |      ✓      |      ✓      |     ✓      |
| **Try<T>**         |    ✓     |    ✗     |    ✗     |      ✗      |      ✓      |      ✓      |     ✓      |
| **IO<R,E,A>**      |    ✗     |    ✗     |    ✓     |      ✗      |      ✓      |      ✗      |     ✗      |
| **List<A>**        |    ✓     |    ✗     |    ✓     |      ✗      |      ✓      |      ✓      |     ✗      |
| **Set<A>**         |    ✓     |    ✗     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Map<K,V>**       |    ✓     |    ✗     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Lazy<T>**        |    ✓     |    ✗     |    ✗     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Stack<A>**       |    ✓     |    ✓     |    ✗     |      ✗      |      ✗      |      ✗      |     ✗      |
| **LazyList<A>**    |    ✓     |    ✗     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Tuple<T[]>**     |    ✓     |    ✓     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **TaskOutcome<T>** |    ✓     |    ✗     |    ✗     |      ✗      |      ✓      |      ✗      |     ✓      |

## Companion Methods

All types follow the **Companion pattern** (inspired by Scala), combining constructor functions with static utility methods. Each type provides:

### Common Creation Methods

| Data Structure  | of  | from | pure | empty | none | left | right | success | failure |
| --------------- | :-: | :--: | :--: | :---: | :--: | :--: | :---: | :-----: | :-----: |
| **Option<T>**   |  ✓  |  ✓   |  ✗   |   ✗   |  ✓   |  ✗   |   ✗   |    ✗    |    ✗    |
| **Either<L,R>** |  ✗  |  ✗   |  ✗   |   ✗   |  ✗   |  ✓   |   ✓   |    ✗    |    ✗    |
| **Try<T>**      |  ✓  |  ✗   |  ✗   |   ✗   |  ✗   |  ✗   |   ✗   |    ✓    |    ✓    |
| **IO<R,E,A>**   |  ✗  |  ✓   |  ✗   |   ✗   |  ✗   |  ✗   |   ✗   |    ✓    |    ✓    |
| **List<A>**     |  ✓  |  ✗   |  ✗   |   ✓   |  ✗   |  ✗   |   ✗   |    ✗    |    ✗    |
| **Set<A>**      |  ✓  |  ✗   |  ✗   |   ✓   |  ✗   |  ✗   |   ✗   |    ✗    |    ✗    |
| **Map<K,V>**    |  ✓  |  ✗   |  ✗   |   ✓   |  ✗   |  ✗   |   ✗   |    ✗    |    ✗    |
| **Lazy<T>**     |  ✓  |  ✗   |  ✗   |   ✗   |  ✗   |  ✗   |   ✗   |    ✗    |    ✗    |
| **Stack<A>**    |  ✗  |  ✗   |  ✗   |   ✓   |  ✗   |  ✗   |   ✗   |    ✗    |    ✗    |
| **LazyList<A>** |  ✓  |  ✗   |  ✗   |   ✓   |  ✗   |  ✗   |   ✗   |    ✗    |    ✗    |
| **Tuple<T[]>**  |  ✓  |  ✗   |  ✗   |   ✗   |  ✗   |  ✗   |   ✗   |    ✗    |    ✗    |
| **Identity<T>** |  ✓  |  ✗   |  ✓   |   ✗   |  ✗   |  ✗   |   ✗   |    ✗    |    ✗    |
| **Ref<A>**      |  ✓  |  ✗   |  ✗   |   ✗   |  ✗   |  ✗   |   ✗   |    ✗    |    ✗    |

**Collection creation** - multiple options available:

```typescript
// List creation
List([1, 2, 3]) // from array
List.of(1, 2, 3) // variadic factory
List.empty<number>() // typed empty list

// Set creation
Set([1, 2, 3]) // from array
Set.of(1, 2, 3) // variadic factory
Set.empty<number>() // typed empty set

// Map creation
Map([
  ["a", 1],
  ["b", 2],
]) // from key-value pairs
Map.of<string, number>(["a", 1], ["b", 2]) // variadic factory
Map.empty<string, number>() // typed empty map
```

### Type Guards

Static type guards for narrowing types:

| Data Structure  | Type Guard Methods                           |
| --------------- | -------------------------------------------- |
| **Option<T>**   | `isSome(option)`, `isNone(option)`           |
| **Either<L,R>** | `isLeft(either)`, `isRight(either)`          |
| **Try<T>**      | `isSuccess(tryValue)`, `isFailure(tryValue)` |

### Serialization Methods

All Serializable types provide static deserialization methods:

- `fromJSON(json: string): T` - Deserialize from JSON
- `fromYAML(yaml: string): T` - Deserialize from YAML
- `fromBinary(binary: string): T` - Deserialize from base64-encoded binary

**Note**: See `docs/companion-pattern.md` for complete guide on the Companion pattern.

## Key Methods by Interface

### Functor

- `map<B>(f: (value: A) => B): Functor<B>`

### Applicative (extends Functor)

- `ap<B>(ff: Applicative<(value: A) => B>): Applicative<B>`

### Monad (extends Applicative)

- `flatMap<B>(f: (value: A) => Monad<B>): Monad<B>`

### AsyncMonad (extends Monad)

- `flatMapAsync<B>(f: (value: A) => PromiseLike<AsyncMonad<B>>): PromiseLike<AsyncMonad<B>>`

### Foldable

- `fold<B>(onEmpty: () => B, onValue: (value: A) => B): B`
- `foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B`
- `foldRight<B>(z: B): (op: (a: A, b: B) => B) => B`

### Matchable

- `match<R>(patterns: Record<Tags, (value: A) => R>): R`

### Serializable

- `serialize(): SerializationMethods<T>`
  - `toJSON(): string`
  - `toYAML(): string`
  - `toBinary(): Uint8Array`

### Traversable (extends AsyncMonad)

- `size: number`
- `isEmpty: boolean`
- `contains(value: A): boolean`
- `reduce<B>(f: (acc: B, value: A) => B, initial: B): B`
- `reduceRight<B>(f: (value: A, acc: B) => B, initial: B): B`

### Unsafe

- `orThrow(error?: Error): T`

### Extractable (extends Unsafe)

- `orElse(defaultValue: T): T`
- `or(alternative: Extractable<T>): Extractable<T>`
- `orNull(): T | null`
- `orUndefined(): T | undefined`

### Pipe

- `pipe<U>(f: (value: T) => U): U`

### Collection

- `toList(): List<A>`
- `toSet(): Set<A>`
- `toString(): string`

### ContainerOps

- `count(p: (value: A) => boolean): number`
- `find(p: (value: A) => boolean): A | undefined`
- `exists(p: (value: A) => boolean): boolean`
- `forEach(f: (value: A) => void): void`

### CollectionOps

- `drop(n: number): Self`
- `dropRight(n: number): Self`
- `dropWhile(p: (value: A) => boolean): Self`
- `flatten(): Self`
- `head: A | undefined`
- `headOption: Option<A>`
- `take(n: number): Self`
- `takeWhile(p: (value: A) => boolean): Self`
- `takeRight(n: number): Self`
- `last: A | undefined`
- `lastOption: Option<A>`
- `tail: Self`
- `init: Self`
- `toArray(): A[]`

### List-specific Methods

- `reverse(): List<A>`
- `indexOf(value: A): number`
- `prepend(item: A): List<A>`
- `distinct(): List<A>`
- `sorted(compareFn?): List<A>`
- `sortBy(f, compareFn?): List<A>`
- `zip(other: List<B>): List<[A, B]>`
- `zipWithIndex(): List<[A, number]>`
- `groupBy(f: (a: A) => K): Map<K, List<A>>`
- `partition(p): [List<A>, List<A>]`
- `span(p): [List<A>, List<A>]`
- `slice(start, end): List<A>`

### Do-notation Support

Enables Scala-like for-comprehensions using JavaScript generators:

- `Do(function* () { ... })`: Synchronous monadic comprehensions
- `DoAsync(async function* () { ... })`: Async monadic comprehensions
- `$(monad)`: Helper for type inference with `yield*`

### Reshapeable

Provides type conversion between monadic types:

- `toOption(): Option<T>`
- `toEither<E>(leftValue: E): Either<E, T>`
- `toList(): List<T>`
- `toTry(): Try<T>`

### Promisable

Provides conversion to Promise for async interop:

- `toPromise(): Promise<T>`

## Notes

1. **Functype<A, Tag>**: Implemented by single-value containers (Option, Try, Lazy). Provides full functional programming support.

2. **FunctypeCollection<A, Tag>**: Implemented by collection containers (List, Set). Extends FunctypeBase with collection-specific operations.

3. **Special Cases**:
   - **Either**: Implements FunctypeBase but not full Functype (no Extractable/Matchable)
   - **Map**: Custom implementation with SafeTraversable instead of standard Traversable
   - **Stack**: Implements individual interfaces without FunctypeBase
   - **LazyList**: Lazy evaluation with support for Foldable, Serializable, Pipe, and Typeable interfaces
   - **Tuple**: Enhanced container with Foldable, Serializable, Pipe, Typeable, and Valuable support

4. **Do-notation**: Provides generator-based monadic comprehensions similar to Scala's for-comprehensions. Supports Option, Either, Try, and List with automatic short-circuiting and cartesian products.

5. **Reshapeable**: Enables conversion between different monad types, allowing flexible composition in Do-notation when mixing types.

6. **Promisable**: Provides conversion to Promise for async interoperability. Supported by Option, Either, Try, and TaskOutcome.

7. **Utility Types** (not in matrix):
   - **Cond**: Conditional expression builder
   - **Match**: Pattern matching utility
   - **ValidatedBrand**: Branded types with validation
   - **Task**: Sync/async operation orchestrator returning TaskOutcome<T> with Ok/Err constructors. Includes conversion methods: toEither(), toTry(), toOption(), fromEither(), fromTry().
   - **Throwable**: Enhanced error type

8. **IO<R,E,A>**: Lazy, composable effect type with typed errors and dependency injection.
   - **R** = Requirements (environment/dependencies needed to run)
   - **E** = Error type (typed failures)
   - **A** = Success type (value produced on success)
   - Key features:
     - Lazy execution (nothing runs until explicitly executed)
     - Unified sync/async API (auto-detects Promise returns)
     - Typed errors at compile time
     - Composable via map/flatMap
     - Dependency injection via Tag/Layer/Context
     - Structured concurrency: bracket, race, timeout
     - Generator do-notation (`IO.gen`) and builder do-notation (`IO.Do`)
     - Error handling: catchTag, catchAll, retry, retryWithDelay
     - Execution methods: run(), runOrThrow(), runSync(), runSyncOrThrow(), runExit(), runOption(), runTry()
   - Testing utilities:
     - **TestClock**: Controlled time for testing timeouts/delays
     - **TestContext**: Test environment with mocked services
