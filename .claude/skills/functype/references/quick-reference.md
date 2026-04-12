# Functype Quick Reference

Quick lookup guide for common functype operations.

## Construction

| Type     | Constructor                                                     | Example                                                                                    |
| -------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Option   | `Option(value)`                                                 | `Option("hello")`, `Option.none()`                                                         |
| Either   | `Right(value)`, `Left(error)`, `Either.void<L>()`               | `Right(42)`, `Left("error")`, `Either.void<Error>()` for `Either<Error, void>`             |
| Try      | `Try(() => expr)`, `.success()`, `.failure()`, `.fromPromise()` | `Try(() => JSON.parse(str))`, `Try.success(42)`, `Try.failure("err")`                      |
| List     | `List(array)`, `.of()`, `.empty()`                              | `List([1, 2])`, `List.of(1, 2)`, `List.empty()`                                            |
| Set      | `Set(array)`, `.of()`, `.empty()`                               | `Set([1, 2])`, `Set.of(1, 2)`, `Set.empty()`                                               |
| Obj      | `Obj({...})`, `.of()`, `.empty()`                               | `Obj({ name: "John" })`, `Obj.empty()`                                                     |
| Map      | `Map([[k, v], ...])`, `.of()`, `.empty()`                       | `Map.of(["a", 1])`, `Map.empty()`                                                          |
| Lazy     | `Lazy(() => expression)`                                        | `Lazy(() => expensiveComputation())`                                                       |
| IO       | `IO.sync()`, `IO.succeed()`, `IO.fail()`                        | `IO.sync(() => value)`, `IO.succeed(42)`                                                   |
| Task     | `Task(params).Async()`, `.Sync()`                               | `Task({ name: "Fetch" }).Async(() => fetch(url))`                                          |
| Tuple    | `Tuple(...values)`                                              | `Tuple(42, "hello")`, `Tuple(1, 2, 3)`                                                     |
| Stack    | `Stack.of()`, `Stack.empty()`                                   | `Stack.of(1, 2, 3)`, `Stack.empty<number>()`                                               |
| LazyList | `LazyList(array)`, `.of()`, `.empty()`                          | `LazyList([1, 2])`, `LazyList.of(1, 2, 3)`                                                 |
| Http     | `Http.get(url, { validate }?)`, `.post()`, `.client(config)`    | `Http.get("/api/users", { validate: (d) => schema.parse(d) })`, `Http.client({ baseUrl })` |

**Note**: Collections support multiple creation styles:

- **Constructor `List([...])`**: Use for existing arrays/iterables
- **`.of(...)`**: Use for inline literal values (cleaner syntax)
- **`.empty()`**: Use for typed empty collections (returns singleton - efficient for repeated calls)

## Transformation

| Operation           | Method              | Example                                      |
| ------------------- | ------------------- | -------------------------------------------- |
| Transform value     | `map(fn)`           | `Option(5).map(x => x * 2)`                  |
| Flatten nested      | `flatMap(fn)`       | `Option(user).flatMap(u => Option(u.email))` |
| Filter by condition | `filter(predicate)` | `Option(value).filter(x => x > 0)`           |
| Combine values      | `ap(wrappedFn)`     | `Option(5).ap(Option(x => x * 2))`           |

## Extraction

| Operation           | Method                        | Example                                                    | Returns          |
| ------------------- | ----------------------------- | ---------------------------------------------------------- | ---------------- |
| With default        | `orElse(default)`             | `option.orElse("N/A")`                                     | `T`              |
| With alternative    | `or(alternative)`             | `option.or(Option("alt"))`                                 | `Option<T>`      |
| Or throw            | `orThrow(error?)`             | `option.orThrow()`                                         | `T` or throws    |
| Or null             | `orNull()`                    | `option.orNull()`                                          | `T \| null`      |
| Or undefined        | `orUndefined()`               | `option.orUndefined()`                                     | `T \| undefined` |
| Pattern match       | `fold(onEmpty, onValue)`      | `option.fold(() => 0, x => x)`                             | `R`              |
| Async pattern match | `foldAsync(onEmpty, onValue)` | `await either.foldAsync(e => msg(e), async v => fetch(v))` | `Promise<R>`     |

## Predicates

| Check               | Method            | Returns   |
| ------------------- | ----------------- | --------- |
| Has value (Option)  | `isSome()`        | `boolean` |
| Is empty (Option)   | `isNone()`        | `boolean` |
| Is success (Either) | `isRight()`       | `boolean` |
| Is error (Either)   | `isLeft()`        | `boolean` |
| Is success (Try)    | `isSuccess()`     | `boolean` |
| Is failure (Try)    | `isFailure()`     | `boolean` |
| Contains value      | `contains(value)` | `boolean` |
| Is empty (List)     | `isEmpty()`       | `boolean` |

## Collection Operations

| Operation              | Method                | Example                                  |
| ---------------------- | --------------------- | ---------------------------------------- |
| Add element            | `append(elem)`        | `list.append(4)`                         |
| Add at start           | `prepend(elem)`       | `list.prepend(0)`                        |
| Combine lists          | `concat(other)`       | `list.concat(otherList)`                 |
| First element          | `head`                | `list.head`                              |
| First (safe)           | `headOption`          | `list.headOption`                        |
| Last element           | `last`                | `list.last`                              |
| Last (safe)            | `lastOption`          | `list.lastOption`                        |
| Rest of list           | `tail`                | `list.tail`                              |
| All except last        | `init`                | `list.init`                              |
| Take first N           | `take(n)`             | `list.take(3)`                           |
| Take while matching    | `takeWhile(p)`        | `list.takeWhile(x => x < 5)`             |
| Take last N            | `takeRight(n)`        | `list.takeRight(2)`                      |
| Drop while matching    | `dropWhile(p)`        | `list.dropWhile(x => x < 3)`             |
| Reverse                | `reverse()`           | `list.reverse()`                         |
| Remove duplicates      | `distinct()`          | `list.distinct()`                        |
| Sort (natural)         | `sorted()`            | `list.sorted()`                          |
| Sort by key            | `sortBy(f)`           | `list.sortBy(u => u.name)`               |
| Zip with another list  | `zip(list)`           | `list.zip(otherList)`                    |
| Zip with indices       | `zipWithIndex()`      | `list.zipWithIndex()`                    |
| Group by key           | `groupBy(f)`          | `list.groupBy(x => x.type)`              |
| Partition by predicate | `partition(p)`        | `list.partition(x => x > 0)`             |
| Span (prefix split)    | `span(p)`             | `list.span(x => x < 5)`                  |
| Slice range            | `slice(s, e)`         | `list.slice(1, 4)`                       |
| Find index             | `indexOf(v)`          | `list.indexOf(42)`                       |
| Reduce left            | `foldLeft(init)(fn)`  | `list.foldLeft(0)((sum, n) => sum + n)`  |
| Reduce right           | `foldRight(init)(fn)` | `list.foldRight(0)((n, sum) => sum + n)` |
| Standard reduce        | `reduce(fn, init)`    | `list.reduce((acc, n) => acc + n, 0)`    |

## Conversion

| From   | To     | Method                                      |
| ------ | ------ | ------------------------------------------- |
| Option | Either | `fold(() => Left(error), v => Right(v))`    |
| Option | Try    | N/A (not direct)                            |
| Try    | Option | `toOption()`                                |
| Try    | Either | `toEither()`                                |
| Either | Option | `fold(() => Option.none(), v => Option(v))` |
| List   | Array  | `toArray()`                                 |
| List   | Set    | `toSet()`                                   |
| Array  | List   | `List.from(array)` or `List(array)`         |
| Set    | List   | `List.from(set)`                            |

## Common Patterns Cheat Sheet

### Null Safety

```typescript
// Before
const name = user?.name ?? "Unknown"

// After
const name = Option(user)
  .map((u) => u.name)
  .orElse("Unknown")
```

### Error Handling

```typescript
// Before
try {
  return riskyOperation()
} catch (e) {
  return defaultValue
}

// After
Try(() => riskyOperation()).orElse(defaultValue)
```

### Validation

```typescript
// Before
function validate(email: string): string | null {
  return email.includes("@") ? email : null
}

// After
function validate(email: string): Either<string, string> {
  return email.includes("@") ? Right(email) : Left("Invalid email")
}
```

### Array Processing

```typescript
// Before
const result = array.filter((x) => x > 0).map((x) => x * 2)

// After (immutable)
const result = List(array)
  .filter((x) => x > 0)
  .map((x) => x * 2)
  .toArray()
```

## Pipeline Composition

### Option Pipeline

```typescript
Option(user)
  .flatMap((u) => Option(u.profile))
  .flatMap((p) => Option(p.settings))
  .map((s) => s.theme)
  .filter((theme) => validThemes.includes(theme))
  .orElse("default")
```

### Either Pipeline

```typescript
validateEmail(input)
  .flatMap((email) => validateDomain(email))
  .flatMap((email) => checkBlacklist(email))
  .fold(
    (error) => console.error(error),
    (email) => sendWelcome(email),
  )
```

### Obj Pipeline

```typescript
// Build HTTP headers with conditional auth
const headers = Obj({ "User-Agent": "MyApp/1.0" } as Record<string, string>)
  .assign({ "Content-Type": "application/json" })
  .when(requiresAuth, { Authorization: `Bearer ${token}` })
  .value()

// Object manipulation
const user = Obj({ name: "John", age: 30, role: "admin" })
user.get("name") // Some("John")
user.pick("name", "role").value() // { name: "John", role: "admin" }
user.omit("role").value() // { name: "John", age: 30 }
user.set("age", 31).value() // { name: "John", age: 31, role: "admin" }
```

### List Pipeline

```typescript
List(users)
  .filter((u) => u.isActive)
  .map((u) => u.email)
  .filter((email) => email.includes("@"))
  .flatMap((email) => List(email.split("@")))
  .toSet()
  .toArray()
```

## Do-Notation

Generator-based monadic comprehensions (Scala-like for-comprehensions):

```typescript
import { Do, DoAsync, $ } from "functype"

// Synchronous comprehensions
const result = Do(function* () {
  const x = yield* $(Option(5))
  const y = yield* $(Option(10))
  return x + y
}) // Option(15)

// Async comprehensions
const asyncResult = await DoAsync(async function* () {
  const user = yield* $(await fetchUserAsync(userId))
  return user
})

// Cartesian products with List (2.5x-12x faster than nested flatMap)
const pairs = Do(function* () {
  const x = yield* $(List([1, 2, 3]))
  const y = yield* $(List([10, 20]))
  return { x, y }
}) // List of 6 pairs
```

**Note**: First monad determines return type. Supports Option, Either, Try, List.

## IO Operations

| Operation      | Method                        | Example                                    |
| -------------- | ----------------------------- | ------------------------------------------ |
| Create sync    | `IO.sync(fn)`                 | `IO.sync(() => value)`                     |
| Create async   | `IO.async(fn)`                | `IO.async(() => promise)`                  |
| Pure success   | `IO.succeed(value)`           | `IO.succeed(42)`                           |
| Pure failure   | `IO.fail(error)`              | `IO.fail(new Error("oops"))`               |
| From promise   | `IO.tryPromise({try, catch})` | `IO.tryPromise({ try: () => fetch(url) })` |
| Access service | `IO.service(Tag)`             | `IO.service(Database)`                     |
| Provide deps   | `effect.provide(layer)`       | `program.provide(dbLayer)`                 |
| Run (async)    | `effect.run()`                | `await effect.run()`                       |
| Run (sync)     | `effect.runSync()`            | `effect.runSync()`                         |
| Run to Either  | `effect.runEither()`          | `await effect.runEither()`                 |

## Task Operations

| Operation       | Method                          | Example                                             |
| --------------- | ------------------------------- | --------------------------------------------------- |
| Async operation | `Task(params).Async(fn, errFn)` | `Task({ name: "Fetch" }).Async(() => fetch(url))`   |
| Sync operation  | `Task(params).Sync(fn, errFn)`  | `Task({ name: "Parse" }).Sync(() => JSON.parse(s))` |
| Ok result       | `Task.ok(value)`                | `Task.ok(42)`                                       |
| Err result      | `Task.err(error)`               | `Task.err("failed")`                                |
| Cancellable     | `Task.cancellable(fn)`          | `Task.cancellable(async (token) => { ... })`        |
| With progress   | `Task.withProgress(fn, onProg)` | `Task.withProgress(fn, p => console.log(p))`        |
| Race            | `Task.race(tasks, timeout?)`    | `Task.race([p1, p2], 5000)`                         |
| From promise fn | `Task.fromPromise(fn)`          | `Task.fromPromise(fetchUser)`                       |
| From callback   | `Task.fromNodeCallback(fn)`     | `Task.fromNodeCallback(fs.readFile)`                |
| Match outcome   | `outcome.fold(onErr, onOk)`     | `result.fold(e => "fail", v => "ok")`               |
| Convert         | `outcome.toEither()`            | `result.toEither()`, `.toOption()`, `.toTry()`      |

## Tuple Operations

| Operation        | Method             | Example                                |
| ---------------- | ------------------ | -------------------------------------- |
| Create           | `Tuple(...values)` | `Tuple(42, "hello")`                   |
| First element    | `first()`          | `pair.first()`                         |
| Second element   | `second()`         | `pair.second()`                        |
| Transform first  | `mapFirst(fn)`     | `pair.mapFirst(x => x * 2)`            |
| Transform second | `mapSecond(fn)`    | `pair.mapSecond(s => s.toUpperCase())` |
| Swap elements    | `swap()`           | `pair.swap()`                          |
| Apply function   | `apply(fn)`        | `pair.apply((a, b) => a + b)`          |
| Concatenate      | `concat(other)`    | `pair.concat(Tuple(true))`             |

## Stack Operations

| Operation     | Method          | Example                                      |
| ------------- | --------------- | -------------------------------------------- |
| Create empty  | `Stack.empty()` | `Stack.empty<number>()`                      |
| Create from   | `Stack.of(...)` | `Stack.of(1, 2, 3)`                          |
| Push          | `push(value)`   | `stack.push(4)`                              |
| Pop           | `pop()`         | `stack.pop()` → `[Option<T>, Stack<T>]`      |
| Peek          | `peek()`        | `stack.peek()` → `Option<T>`                 |
| Pattern match | `match({...})`  | `stack.match({ Empty: ..., NonEmpty: ... })` |

## TypeScript Tips

### Type Inference

```typescript
// Compiler infers Option<number>
const num = Option(5)

// Explicit type when needed
const str: Option<string> = Option.none()

// Generic constraint
function process<T>(opt: Option<T>): T {
  return opt.orThrow()
}
```

### Type Guards

```typescript
const value: Option<string> = Option("hello")

if (value.isSome()) {
  // TypeScript still treats value as Option<string>
  // Use orElse or fold to extract
  const str = value.orElse("")
}
```

### Async Types

```typescript
// Promise with Option
async function fetchUser(id: string): Promise<Option<User>> {
  const user = await api.getUser(id)
  return Option(user)
}

// Promise with Either
async function fetchUserSafe(id: string): Promise<Either<Error, User>> {
  try {
    const user = await api.getUser(id)
    return Right(user)
  } catch (error) {
    return Left(error as Error)
  }
}
```

## Common Mistakes

| ❌ Wrong                                       | ✅ Correct                                   |
| ---------------------------------------------- | -------------------------------------------- |
| `Option(value).map(...)` without extraction    | `Option(value).map(...).orElse(default)`     |
| `Option(user).map(u => Option(u.email))`       | `Option(user).flatMap(u => Option(u.email))` |
| `Try(() => x).orThrow()` in non-error contexts | `Try(() => x).orElse(fallback)`              |
| `list.toArray().push(item)` (mutates)          | `list.append(item).toArray()`                |
| Using `any` type                               | Use proper type parameters: `Option<T>`      |

## Performance Tips

1. **Use Lazy for expensive computations**

   ```typescript
   const expensive = Lazy(() => heavyComputation())
   // Only computed when accessed via .value()
   ```

2. **Use LazyList for large datasets**

   ```typescript
   LazyList.from(0, (n) => n + 1)
     .filter((n) => n % 2 === 0)
     .take(10)
   ```

3. **Memoize with Lazy**
   ```typescript
   const memoized = Lazy(() => computeOnce())
   // Always returns same value after first computation
   ```

## Either is a Discriminated Union

As of 0.53.0, `Either<L, R>` is defined as `LeftOf<L, R> | RightOf<L, R>`. This means TypeScript narrows `value` in both branches of `isLeft()` / `isRight()` or `_tag` checks — no `as R` casts needed.

```typescript
const e: Either<Error, number> = parse("42")
if (e.isLeft()) {
  console.error(e.value.message) // e narrowed to LeftOf — value is Error
  return
}
const n: number = e.value // narrowed to RightOf — value is number, no cast
```

If you need to reference a specific variant, import `LeftOf` / `RightOf` from `functype/either`.
