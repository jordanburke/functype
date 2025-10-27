export async function GET() {
  const markdown = `# Functype Feature Matrix

Complete overview of interfaces supported by each data structure in the functype library.

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

| Data Structure     | Typeable | Valuable | Iterable | PromiseLike | Do-notation | Reshapeable | Promisable |
| ------------------ | :------: | :------: | :------: | :---------: | :---------: | :---------: | :--------: |
| **Option<T>**      |    ✓     |    ✗     |    ✗     |      ✗      |      ✓      |      ✓      |     ✓      |
| **Either<L,R>**    |    ✓     |    ✗     |    ✗     |      ✓      |      ✓      |      ✓      |     ✓      |
| **Try<T>**         |    ✓     |    ✗     |    ✗     |      ✗      |      ✓      |      ✓      |     ✓      |
| **List<A>**        |    ✓     |    ✗     |    ✓     |      ✗      |      ✓      |      ✓      |     ✗      |
| **Set<A>**         |    ✓     |    ✗     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Map<K,V>**       |    ✓     |    ✗     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Lazy<T>**        |    ✓     |    ✗     |    ✗     |      ✗      |      ✗      |      ✗      |     ✗      |
| **Stack<A>**       |    ✓     |    ✓     |    ✗     |      ✗      |      ✗      |      ✗      |     ✗      |
| **LazyList<A>**    |    ✓     |    ✗     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **FPromise<T,E>**  |    ✗     |    ✗     |    ✗     |      ✓      |      ✗      |      ✗      |     ✗      |
| **Tuple<T[]>**     |    ✓     |    ✓     |    ✓     |      ✗      |      ✗      |      ✗      |     ✗      |
| **TaskOutcome<T>** |    ✓     |    ✗     |    ✗     |      ✗      |      ✓      |      ✗      |     ✓      |

## Key Methods by Interface

### Functor

Provides the fundamental \`map\` operation for transforming wrapped values:

- \`map<B>(f: (value: A) => B): Functor<B>\`

**Example:**
\`\`\`typescript
Option(5).map(x => x * 2)  // Some(10)
List([1, 2, 3]).map(x => x * 2)  // List([2, 4, 6])
\`\`\`

### Applicative (extends Functor)

Adds the ability to apply wrapped functions to wrapped values:

- \`ap<B>(ff: Applicative<(value: A) => B>): Applicative<B>\`

**Example:**
\`\`\`typescript
const add = (x: number) => (y: number) => x + y
Option(5).map(add).ap(Option(10))  // Some(15)
\`\`\`

### Monad (extends Applicative)

Enables chaining operations that return wrapped values:

- \`flatMap<B>(f: (value: A) => Monad<B>): Monad<B>\`

**Example:**
\`\`\`typescript
Option(5).flatMap(x => x > 0 ? Some(x * 2) : None())  // Some(10)
\`\`\`

### AsyncMonad (extends Monad)

Supports asynchronous monadic operations:

- \`flatMapAsync<B>(f: (value: A) => PromiseLike<AsyncMonad<B>>): PromiseLike<AsyncMonad<B>>\`

**Example:**
\`\`\`typescript
await Option(userId).flatMapAsync(id => fetchUser(id))
\`\`\`

### Foldable

Provides fold operations for extracting and accumulating values:

- \`fold<B>(onEmpty: () => B, onValue: (value: A) => B): B\`
- \`foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B\`
- \`foldRight<B>(z: B): (op: (a: A, b: B) => B) => B\`

**Example:**
\`\`\`typescript
Option(5).fold(() => 0, x => x * 2)  // 10
List([1, 2, 3]).foldLeft(0)((acc, x) => acc + x)  // 6
\`\`\`

### Matchable

Pattern matching on wrapped values:

- \`match<R>(patterns: Record<Tags, (value: A) => R>): R\`

**Example:**
\`\`\`typescript
Option(5).match({
  Some: x => \`Value: \${x}\`,
  None: () => "Empty"
})  // "Value: 5"
\`\`\`

### Serializable

Serialization to various formats:

- \`serialize(): SerializationMethods<T>\`
  - \`toJSON(): string\`
  - \`toYAML(): string\`
  - \`toBinary(): Uint8Array\`

**Example:**
\`\`\`typescript
Option(5).serialize().toJSON()  // '{"_tag":"Some","value":5}'
\`\`\`

### Traversable (extends AsyncMonad)

Container traversal operations:

- \`size: number\`
- \`isEmpty: boolean\`
- \`contains(value: A): boolean\`
- \`reduce<B>(f: (acc: B, value: A) => B, initial: B): B\`
- \`reduceRight<B>(f: (value: A, acc: B) => B, initial: B): B\`

**Example:**
\`\`\`typescript
List([1, 2, 3]).size  // 3
List([1, 2, 3]).contains(2)  // true
\`\`\`

### Unsafe

Potentially throwing operations:

- \`orThrow(error?: Error): T\`

**Example:**
\`\`\`typescript
Option(5).orThrow()  // 5
None().orThrow()  // throws Error
\`\`\`

### Extractable (extends Unsafe)

Safe value extraction with defaults:

- \`orElse(defaultValue: T): T\`
- \`or(alternative: Extractable<T>): Extractable<T>\`
- \`orNull(): T | null\`
- \`orUndefined(): T | undefined\`

**Example:**
\`\`\`typescript
Option(5).orElse(0)  // 5
None().orElse(0)  // 0
\`\`\`

### Pipe

Function composition:

- \`pipe<U>(f: (value: T) => U): U\`

**Example:**
\`\`\`typescript
Option(5).pipe(opt => opt.map(x => x * 2).getOrElse(0))  // 10
\`\`\`

### Collection

Collection conversion operations:

- \`toList(): List<A>\`
- \`toSet(): Set<A>\`
- \`toString(): string\`

**Example:**
\`\`\`typescript
Set([1, 2, 3]).toList()  // List([1, 2, 3])
\`\`\`

### ContainerOps

Universal container operations:

- \`count(p: (value: A) => boolean): number\`
- \`find(p: (value: A) => boolean): A | undefined\`
- \`exists(p: (value: A) => boolean): boolean\`
- \`forEach(f: (value: A) => void): void\`

**Example:**
\`\`\`typescript
List([1, 2, 3, 4]).count(x => x % 2 === 0)  // 2
List([1, 2, 3, 4]).exists(x => x > 3)  // true
\`\`\`

### CollectionOps

Collection-specific operations:

- \`drop(n: number): Self\`
- \`dropRight(n: number): Self\`
- \`dropWhile(p: (value: A) => boolean): Self\`
- \`flatten(): Self\`
- \`head: A\`
- \`headOption: Option<A>\`
- \`toArray(): A[]\`

**Example:**
\`\`\`typescript
List([1, 2, 3, 4]).drop(2)  // List([3, 4])
List([1, 2, 3]).headOption  // Some(1)
\`\`\`

### Do-notation Support

Scala-like for-comprehensions using JavaScript generators:

- \`Do(function* () { ... })\`: Synchronous monadic comprehensions
- \`DoAsync(async function* () { ... })\`: Async monadic comprehensions
- \`$(monad)\`: Helper for type inference with \`yield*\`

**Example:**
\`\`\`typescript
Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
})  // Some(15)
\`\`\`

### Reshapeable

Type conversion between monadic types:

- \`toOption(): Option<T>\`
- \`toEither<E>(leftValue: E): Either<E, T>\`
- \`toList(): List<T>\`
- \`toTry(): Try<T>\`

**Example:**
\`\`\`typescript
Right(5).toOption()  // Some(5)
Left("error").toOption()  // None
\`\`\`

### Promisable

Conversion to Promise for async interop:

- \`toPromise(): Promise<T>\`

**Example:**
\`\`\`typescript
Option(5).toPromise()  // Promise.resolve(5)
None().toPromise()  // Promise.reject(new Error("None"))
\`\`\`

## Notes

### Partial Support (◐)

- **Map<K,V> Functor**: Only supports \`map\` over values, not keys
- **LazyList<A> Functor/Monad**: Custom implementation for lazy evaluation
- **Tuple<T[]> Functor/Monad**: Custom implementation preserving tuple structure

### Full Support (✓)

Data structures marked with ✓ provide complete, standards-compliant implementations of the interface with all expected methods and behaviors.

### Inheritance (←)

Some interfaces (like Unsafe from Extractable) are inherited automatically. When you see ←, the data structure has this interface because it implements a parent interface.

## Using This Matrix

### Finding the Right Data Structure

1. **Need null safety?** → Use **Option<T>**
2. **Need error context?** → Use **Either<L,R>** or **Try<T>**
3. **Need async operations?** → Use **Task** or types with **AsyncMonad**
4. **Need collections?** → Use **List<A>** or **Set<A>**
5. **Need lazy evaluation?** → Use **Lazy<T>** or **LazyList<A>**

### Finding Operations

1. **Want to transform?** → Look for **Functor** (map)
2. **Want to chain?** → Look for **Monad** (flatMap)
3. **Want to extract?** → Look for **Extractable** (orElse, orThrow)
4. **Want to iterate?** → Look for **Iterable** or **CollectionOps**
5. **Want pattern matching?** → Look for **Matchable** or use **fold**

## API Reference

For complete API documentation, see the [Functype API docs](https://functype.org/api-docs).

## Learn More

- [Option Documentation](https://functype.org/option)
- [Either Documentation](https://functype.org/either)
- [List Documentation](https://functype.org/list)
- [Task Documentation](https://functype.org/task)
- [Do-notation Guide](https://functype.org/do-notation)
`

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}
