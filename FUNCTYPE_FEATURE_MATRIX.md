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
| **TaskOutcome<T>** |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✓      |   ←    |  ✓   |     ✗      |      ✓       |       ✗       |
| **List<A>**        |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✗      |   ✗    |  ✓   |     ✓      |      ✓       |       ✓       |
| **Set<A>**         |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✗      |   ✗    |  ✓   |     ✓      |      ✓       |       ✓       |
| **Map<K,V>**       |    ◐    |      ✗      |   ✗   |     ✗      |    ✓     |     ✗     |      ✓       |      ◐      |      ✗      |   ✗    |  ✓   |     ✓      |      ✗       |       ✗       |
| **Lazy<T>**        |    ✓    |      ✓      |   ✓   |     ✓      |    ✓     |     ✗     |      ✓       |      ✓      |      ✓      |   ←    |  ✓   |     ✗      |      ✓       |       ✗       |
| **Stack<A>**       |    ✗    |      ✗      |   ✗   |     ✗      |    ✓     |     ✓     |      ✓       |      ✓      |      ✗      |   ✗    |  ✓   |     ✗      |      ✗       |       ✗       |
| **LazyList<A>**    |    ◐    |      ✗      |   ◐   |     ✗      |    ✓     |     ✗     |      ✓       |      ✗      |      ✗      |   ✗    |  ✓   |     ✗      |      ✗       |       ✗       |
| **FPromise<T,E>**  |    ✗    |      ✗      |   ✗   |     ✗      |    ✗     |     ✗     |      ✗       |      ✗      |      ✗      |   ✗    |  ✗   |     ✗      |      ✗       |       ✗       |
| **Tuple<T[]>**     |    ◐    |      ✗      |   ◐   |     ✗      |    ✓     |     ✗     |      ✓       |      ✗      |      ✗      |   ✗    |  ✓   |     ✗      |      ✗       |       ✗       |

## Additional Properties

| Data Structure    | Typeable | Valuable | Iterable | PromiseLike | Do-notation | Reshapeable | Promisable |
| ----------------- | :------: | :------: | :------: | :---------: | :---------: | :---------: | :--------: |
| **Option<T>**     |    ✓     |    ✗     |    ✗     |      ✗      |      ✓      |      ✓      |     ✓      |
| **Either<L,R>**   |    ✓     |    ✗     |    ✗     |      ✓      |      ✓      |      ✓      |     ✓      |
| **Try<T>**        |    ✓     |    ✗     |    ✗     |      ✗      |      ✓      |      ✓      |     ✓      |
| **List<A>**       |    ✓     |    ✗     |    ✓     |      ✗      |      ✓      |      ✓      |     ✗      |
| **Set<A>**        |    ✓     |    ✗     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Map<K,V>**      |    ✓     |    ✗     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Lazy<T>**       |    ✓     |    ✗     |    ✗     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Stack<A>**      |    ✓     |    ✓     |    ✗     |      ✗      |      ✗      |      ✗      |     ✗      |
| **LazyList<A>**   |    ✓     |    ✗     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **FPromise<T,E>** |    ✗     |    ✗     |    ✗     |      ✓      |      ✗      |      ✗      |     ✗      |
| **Tuple<T[]>**    |    ✓     |    ✓     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **TaskOutcome<T>** |    ✓     |    ✗     |    ✗     |      ✗      |      ✓      |      ✗      |     ✓      |

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

- `getOrThrow(error?: Error): T`

### Extractable (extends Unsafe)

- `getOrElse(defaultValue: T): T`
- `orElse(alternative: Extractable<T>): Extractable<T>`
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
- `head: A`
- `headOption: Option<A>`
- `toArray(): A[]`

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
   - **FPromise**: Promise-like with functional methods
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
