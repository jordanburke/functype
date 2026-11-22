# Upgrading to functype 2.0

How to move a codebase from functype 1.x to 2.0: what the compiler finds for you, what it can't see, and what to change in each package.

## Before you start

- **Upgrade every functype package together.** functype-os and functype-react need functype 2.0, and the eslint pair moves to `2.200.x` with it:

  ```bash
  pnpm add functype@^2 functype-os@^2 functype-log@^2 functype-react@^2
  pnpm add -D eslint-plugin-functype@^2.200.0 eslint-config-functype@^2.200.0
  ```

- **Convert stored data first, on 1.x.** 2.0 can't read two formats that 1.x wrote:
  - **YAML** from `toYAML`. Convert it to JSON with 1.27.0 or later, whose `fromYAML` reads what `toYAML` writes.
  - **Serialized `Task` values**, envelopes with `"@functype": "Task"`. `Serialization.deserialize` returns a `Failure` for them in 2.0.
- **Check the libraries that depend on functype, not only your own code.** A 1.x library with an open peer range, such as `"functype": ">=1.4.1"`, installs against 2.0 without a warning, and its built code can still call 1.x APIs. In one case a library's `first()` returned a function to every caller, and all 1,200 of the consumer's tests passed.
  - List them with `pnpm why functype` (or `npm ls functype`).
  - Check each one has a 2.x release. A `^1` peer range flags the mismatch: npm refuses the install, and pnpm warns (run `pnpm peers check`).
  - Add a test that runs each library's main calls against the functype you install.
- **Check command-line tools built on functype 1.** A workspace that overrides `functype` to 2.0 gives functype 2 to every tool installed in it. A 1.x tool then crashes on import, with `SyntaxError: The requested module 'functype' does not provide an export named 'Ok'`; in CI that can look like a step failing in one second with no output. Run it with `npx`, or outside the workspace, until it has a 2.x release.
- **There is no codemod yet.** A type-aware upgrade tool is planned for after 2.0. Until then, the compiler and the lists below are the guide.

## Step 1: fix what the compiler reports

Run `tsc`. Most of 2.0's changes fail to compile, and each message points at the fix.

### `getOrElse` and `orElse` take a function, and `or` is gone

| 1.x                     | 2.0                           |
| ----------------------- | ----------------------------- |
| `opt.orElse(0)`         | `opt.getOrElse(() => 0)`      |
| `opt.or(backup)`        | `opt.orElse(() => backup)`    |
| `map.getOrElse(key, 0)` | `map.getOrElse(key, () => 0)` |
| `map.orElse(key, alt)`  | `map.orElse(key, () => alt)`  |
| `exit.orElse(0)`        | `exit.getOrElse(() => 0)`     |

```ts
declare const port: Option<number>;
declare const fallback: Option<number>;

const value: number = port.getOrElse(() => 8080);
const orBackup: Option<number> = port.orElse(() => fallback);
```

This covers Option, Either, Try, Lazy, Obj, Exit, Map and TracedOption.

**Order matters:** change `orElse` to `getOrElse` first, then `or` to `orElse`. Map is the exception: its `getOrElse` and `orElse` keep their names, and only their last argument becomes a function. Don't text-replace `.or(` or `.orElse(`, because `orElse` now means something else and `.or(` is also zod's.

### `head`, `last`, `tail`, `init`, `headOption` and `lastOption` are methods

On List, Set and LazyList, add `()`: `list.tail()`, `set.head()`, `lazy.lastOption()`. `size`, `length` and `isEmpty` stay properties.

```ts
const xs = List([1, 2, 3]);
const first: Option<number> = xs.headOption();
const rest: List<number> = xs.tail();
```

### `Task` is deleted: use `IO`

| 1.x                                      | 2.0                                                                |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `Task(p).Sync(f, onError)`               | `IO.tryCatch(f, onError).runSync()`                                |
| `await Task(p).Async(f, onError)`        | `await IO.tryPromise({ try: f, catch: onError }).run()`            |
| `Task.ok(v)` / `Ok(v)`                   | `IO.succeed(v)`, or `Right(v)` for a plain value                   |
| `Task.err(e)` / `Err(e)`                 | `IO.fail(e)`, or `Left(e)`                                         |
| `isOk()` / `isErr()` on a result         | `isRight()` / `isLeft()`                                           |
| `Task.race(tasks, ms)`                   | `IO.race(effects).timeout(ms)`                                     |
| `Task.cancellable` / `CancellationToken` | `runCancellable()`, `runExit({ signal })` or `interruptOn(signal)` |
| `Task.getErrorChain(e)`                  | `getErrorChain(e)`                                                 |

```ts
const parsed: Either<Error, unknown> = IO.tryCatch(
  () => JSON.parse("{}") as unknown,
  (e) => (e instanceof Error ? e : new Error(String(e))),
).runSync();

const load = (url: string): IO<never, Error, Response> =>
  IO.tryPromise({
    try: (signal) => fetch(url, { signal }),
    catch: (e) => new Error(String(e)),
  });
```

### Removed names

| Removed                    | Use                                                                   |
| -------------------------- | --------------------------------------------------------------------- |
| `Http`'s `validate` option | `decode`, with `Decoder.fromThrowing(parse)` for a parser that throws |
| `IO.forEachPar`            | `IO.forEach`, with `{ concurrency }` to run in parallel               |
| `IO.any`                   | `IO.firstSuccessOf`                                                   |
| `createCustomSerializer`   | `createTaggedSerializer(marker, tag, fields)`                         |
| `toYAML` / `fromYAML`      | `toJSON` / `fromJSON`, or `toBinary` / `fromBinary`                   |

### Other type errors

- **`IO.gen` yields IOs, with `yield*`.** `yield io` gives `unknown`, and yielding a Promise or an Option fails to compile. `IO.gen` now carries the services and errors its body uses, so provide its services before running it.
- **`run()` on an IO with unprovided services** fails with a message naming them. Provide them with `provideLayer` or `provideService`.
- **Option, Try and Exit are unions.** `interface X extends Option<T>` becomes `extends OptionBase<T>`, and likewise `TryBase<T>` and `ExitBase<E, A>`.
- **Identity, Ref and TracedOption need their constructors.** An object literal typed as one no longer compiles: use `Identity(v)`, `Ref(v)` or `TracedOption(option, tracer, spanId)`.
- **A Tuple's `length` is read-only.**

```ts
const program = IO.gen(function* () {
  const a = yield* IO.succeed(1);
  const b = yield* IO.sync(() => a + 1);
  return a + b;
});
const total: number = program.runSyncOrThrow();
```

## Step 2: check what the compiler can't see

These compile and behave differently. Search for each one.

### Detached method calls throw

Every value type now shares its methods through a prototype, so a method called without its value has no `this`. Passed to an IO step, such as `IO.sync` or `map`, it ends the run in a `Die`:

```ts ignore
const { getOrElse } = opt; // throws when called
xs.filter(set.has); // throws
IO.sync(ref.get); // dies when run
IO.succeed(1).map(ref.set); // dies when run
```

Call the method on the value, or wrap it:

```ts
declare const set: Set<number>;
declare const ref: Ref<number>;
declare const ys: ReadonlyArray<number>;

const kept = ys.filter((y) => set.has(y));
const read = IO.sync(() => ref.get());
```

ts-builds' functype preset reports these through `@typescript-eslint/unbound-method`. From ts-builds 5.0.0, the release for functype 2.0, they are errors; in 4.8.x they are warnings. The rule sees methods declared with method syntax, which covers every functype value type in 2.0.

### `run()` rejects on a defect

- **`run()`'s `Left` holds only typed errors.** A defect, such as a throw in `IO.sync` or a `map` callback, rejects the promise. An interruption rejects with an `InterruptedError`, except inside an `interruptOn(signal)` region or `runCancellable()`, which still resolve to `Left(InterruptedError)`.
- **`runSync()`** throws a defect instead of returning it in a `Left`.
- **A `throw` inside `IO.gen` is a defect.** Use `yield* IO.fail(e)` for a typed failure.
- **More defects:** `IO.race([])`, `IO.firstSuccessOf([])` and an `IO.service` whose service was never provided are now defects, so they reject `run()`.
- **`runCancellable().result` rejects on a defect.** A caller that keeps only `cancel` gets an unhandled rejection; attach a handler to `result`.
- **Fix:** attach a rejection handler to each `run()`, or use `runExit()`, which never rejects and reports all four outcomes.

```ts
declare const job: IO<never, string, number>;

const report = async (): Promise<string> => {
  const exit = await job.runExit();
  return exit.fold(
    (error) => `failed: ${error}`,
    (value) => `ok: ${value}`,
    () => "interrupted",
    (defect) => `bug: ${String(defect)}`,
  );
};
```

### Concurrency and cancellation

- **`IO.all` runs its effects at once.** It is fail-fast and interrupts the rest. Pass `{ concurrency: 1 }` where order matters, or where later effects must not start after a failure.
- **`IO.async` and `IO.tryPromise` thunks get an `AbortSignal` as their first argument** inside `IO.all`, `race` and `timeout`, even when the run has none. A thunk whose first parameter means something else, such as `(page = 1) => load(page)`, gets the signal there: wrap it, `IO.async(() => load())`.
- **`race` and `timeout` stop the losers.** Work that must finish belongs outside the race.
- **`IO.sleep`, `IO.never` and `.delay` wake on interruption.** Under `runSync` they throw `UnsupportedSyncOperationError`.
- **An effect's synchronous steps run without a break** under `run()`. Add `IO.sleep(0)` to yield between them.
- **A `bracket` whose release fails** fails the run under `run()`, as it did under `runSync()`.

```ts
declare const steps: ReadonlyArray<IO<never, Error, number>>;

const inOrder = IO.all(steps, { concurrency: 1 });
```

### Other changes the compiler can't see

- **Accessor reads without `()`** in a truthiness check, before `??`, in a template string, or passed as `unknown` or a generic (`expect(list.head)`, `Option(list.head)`) get the method itself. That includes the built code of a library you depend on: see [Before you start](#before-you-start).
- **A default that is a function:** `opt.getOrElse(fn)` calls `fn`. Write `opt.getOrElse(() => fn)` to get the function back.
- **Side effects in a default** now run only when the value is missing.
- **Code typed `any`** passes the compiler with a 1.x call, such as `opt.orElse(42)`, and fails at run time.
- **`Http`'s `validate`** carried in through a spread is ignored.
- **Own keys are the data:** `Object.keys`, spreads and snapshots see `_tag` and the data, not methods. Re-record snapshots. `toEqual` now compares functype values by their data.
- **Some methods return the same value** instead of a copy when nothing changed, so an `===` check can turn `true`.
- **`Set.empty()` and `Map.empty()`** build a new value per call, so `Set.empty() === Set.empty()` is `false`.
- **Lazy's `filter`, `find` and `toOption` return a real `None`,** so a `=== None` check is now `false`: use `isNone()`. A Lazy's `typeable` field is gone: read `_tag`.
- **`Layer.build` rejects** where a throwing `sync` or `fromService` factory used to throw synchronously.
- **`Http` decode errors:** with `Decoder.fromThrowing`, `DecodeError`'s `cause` is a `DecoderError` leaf wrapping the thrown value, so a `cause instanceof ZodError` check needs to look one level deeper.
- **Serialized forms change:** `JSON.stringify(Ref(1))` is `{"_tag":"Ref","value":1}`, not `{}`. A TracedOption's trace event `op` is `"getOrElse"`, not `"orElse"`.

## Step 3: lint with the one preset

eslint-plugin-functype 2.200 has one preset, `recommended`, where every rule is `error` or `off`. `strict` and `agent` are gone, and naming either fails to load.

```js
import functype from "eslint-plugin-functype";

export default [functype.configs.recommended, functype.configs.tests];
```

Then run `eslint` and fix what it reports:

- **A mutable array type** becomes `ReadonlyArray<T>`, or `List<T>` for a collection you transform.
- **An in-place change,** such as `push`, `sort` or `xs[i] = v`, becomes a new array or a fold.
- **A dropped `Either`, `Try` or `IO`** is handled, returned, or marked with `void` where dropping it is the point.
- **A real boundary** that needs a throw or a mutable array is marked `@interop <reason>`, or wrapped in `Wire<…>`.

The type-aware rules need `parserOptions.projectService`. Without it they report nothing.

## Package by package

### functype-os

- **The async methods return a lazy `IO`** instead of `TaskResult`: `Fs.readFile`, `Fs.writeFile` and the rest of `Fs`'s async methods, `Process.exec`, and `ConfigResolver.resolve` and its siblings.
- **Add `.run()`.** `await Fs.readFile(p)` becomes `await Fs.readFile(p).run()`, which returns an `Either`.
- **Read the result as an `Either`:** `isOk()` becomes `isRight()`, `isErr()` becomes `isLeft()`, and `.error` becomes `.value`.
- **A forgotten `.run()`** compiles and does nothing. `@typescript-eslint/await-thenable` flags it.

### functype-react

| 1.x                           | 2.0                                         |
| ----------------------------- | ------------------------------------------- |
| `useTask`                     | `useIO`, whose factory returns an `IO`      |
| `useTaskPromise`              | `useIOPromise`, which resolves to an `Exit` |
| `useTaskValue`                | `useIOValue`                                |
| `<TaskBoundary>`              | `<AsyncBoundary>`                           |
| `TaskState` / `UseTaskResult` | `AsyncState` / `UseIOResult`                |

- **An effect is cancelled** on unmount or on a `deps` change.
- **`useIO`'s `Failure` carries the effect's typed `E`.** A defect is rethrown during render to the nearest error boundary, so an app with no error boundary now crashes where 1.x showed a failure state. Add an error boundary around components that run effects.

### functype-log

- **`loglayer` is gone.** So are `logLayerAdapter` and `LoggerLive.fromLogLayer`.
- **Use a `sink`:** pass `LoggerLive.console({ sink })` a function that writes to the library you used.
- **The console loggers keep their output,** with three exceptions:
  - a `Promise` in metadata is written as it is, at once, not awaited;
  - an empty `withContext({})`, `child({})` or `withContext({}).child()` writes nothing, where loglayer wrote `{}`;
  - a `level` that isn't a level name, such as `"WARN"`, now lets every level through with a `sink`, as the console already did.

### functype-mcp-server

- **`validate_code` lints with the `recommended` preset** after a snippet type-checks.
- **A snippet that passed can now fail** on a lint rule. Pass `lint: false` to check types alone.

## Where the details are

Every change, with its reasons and measurements, is in the [CHANGELOG](https://github.com/jordanburke/functype/blob/main/packages/functype/CHANGELOG.md) under 2.0.0.
