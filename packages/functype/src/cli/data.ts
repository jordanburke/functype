/**
 * Curated API data for CLI output, optimized for LLM consumption.
 *
 * `interfaces` arrays are composed of (a) the GENERATED_INTERFACES floor
 * derived from each type's `extends` chain in source, plus (b) optional
 * hand-curated additions for capabilities declared inline (e.g. `List.map`
 * lives in the interface body, not via `extends Functor`). The data-sync
 * spec enforces that no source-declared interface is dropped from this list.
 */

import pkg from "../../package.json"
import { GENERATED_INTERFACES, type GeneratedTypeName } from "./interfaces.generated"

export const VERSION = pkg.version

const mergeInterfaces = (typeName: GeneratedTypeName, ...extra: string[]): string[] =>
  Array.from(new Set<string>([...GENERATED_INTERFACES[typeName], ...extra])).sort()

export interface TypeData {
  description: string
  interfaces: string[]
  methods: {
    create?: string[]
    transform?: string[]
    extract?: string[]
    check?: string[]
    other?: string[]
  }
}

export interface InterfaceData {
  extends?: string
  description: string
  methods: string[]
}

export const TYPES: Record<string, TypeData> = {
  Option: {
    description: "Safe nullable handling - Some<T> or None",
    interfaces: mergeInterfaces("Option"),
    methods: {
      create: ["Option(v)", "Option.none()", "Some(v)", "None()"],
      transform: [".map(f)", ".flatMap(f)", ".filter(p)", ".ap(ff)"],
      extract: [
        ".fold(n, s)",
        ".foldAsync(n, s)",
        ".orElse(d)",
        ".orThrow()",
        ".expect(() => never)",
        ".orNull()",
        ".match({Some, None})",
      ],
      check: [".isSome", ".isNone", ".isDefined", ".isEmpty"],
      other: ["Option.sequence(arr)", "Option.traverse(arr, f)"],
    },
  },

  Either: {
    description: "Error handling with Left (error) or Right (success)",
    interfaces: mergeInterfaces("Either", "Traversable"),
    methods: {
      create: ["Right(v)", "Left(e)", "Either.right(v)", "Either.left(e)", "Either.void()"],
      transform: [".map(f)", ".flatMap(f)", ".mapLeft(f)", ".swap()"],
      extract: [
        ".fold(l, r)",
        ".foldAsync(l, r)",
        ".orElse(d)",
        ".orThrow()",
        ".expect((l) => never)",
        ".match({Left, Right})",
      ],
      check: [".isRight", ".isLeft"],
      other: ["Either.sequence(arr)", "Either.traverse(arr, f)", "Either.fromNullable(v, e)"],
    },
  },

  Try: {
    description: "Wrap operations that may throw - Success<T> or Failure",
    interfaces: mergeInterfaces("Try", "Matchable", "Traversable"),
    methods: {
      create: ["Try(() => expr)", "Try.success(v)", "Try.failure(e)", "Try.fromPromise(p)"],
      transform: [".map(f)", ".flatMap(f)", ".recover(f)", ".recoverWith(f)"],
      extract: [
        ".fold(f, s)",
        ".foldAsync(f, s)",
        ".orElse(d)",
        ".orThrow()",
        ".expect((e) => never)",
        ".toOption()",
        ".toEither()",
      ],
      check: [".isSuccess", ".isFailure"],
      other: ["Try.sequence(arr)", "Try.traverse(arr, f)"],
    },
  },

  List: {
    description: "Immutable array with functional operations",
    // List.map / .flatMap / .fold etc. are declared inline on FunctypeCollection,
    // not via `extends Functor/Monad/Foldable`, so these get merged in manually.
    interfaces: mergeInterfaces("List", "Functor", "Monad", "Foldable", "Serializable", "Traversable"),
    methods: {
      create: ["List([...])", "List.of(...)", "List.empty()"],
      transform: [
        ".map(f)",
        ".flatMap(f)",
        ".filter(p)",
        ".take(n)",
        ".takeWhile(p)",
        ".takeRight(n)",
        ".drop(n)",
        ".dropWhile(p)",
        ".concat(list)",
        ".reverse()",
        ".distinct()",
        ".sorted()",
        ".sortBy(f)",
        ".zip(list)",
        ".zipWithIndex()",
        ".prepend(v)",
        ".slice(s, e)",
      ],
      extract: [
        ".fold(z, f)",
        ".reduce(f)",
        ".head",
        ".headOption",
        ".tail",
        ".last",
        ".lastOption",
        ".init",
        ".indexOf(v)",
        ".toArray()",
      ],
      check: [".isEmpty", ".nonEmpty", ".size", ".contains(v)"],
      other: [".groupBy(f)", ".partition(p)", ".span(p)"],
    },
  },

  Set: {
    description: "Immutable set of unique values",
    // Same as List — collection ops are inline on FunctypeCollection.
    interfaces: mergeInterfaces("Set", "Functor", "Foldable", "Serializable", "Traversable"),
    methods: {
      create: ["Set([...])", "Set.of(...)", "Set.empty()"],
      transform: [".map(f)", ".filter(p)", ".union(s)", ".intersection(s)", ".difference(s)", ".add(v)"],
      extract: [".fold(z, f)", ".toArray()"],
      check: [".has(v)", ".isEmpty", ".size"],
    },
  },

  Obj: {
    description: "Immutable object wrapper with fluent operations",
    // Obj uses `Omit<Functype, "map" | "flatMap" | ...>` so the Functype tower
    // doesn't appear in extends, but the methods are re-declared inline.
    interfaces: mergeInterfaces("Obj", "KVTraversable", "Foldable", "Matchable", "Extractable", "Serializable"),
    methods: {
      create: ["Obj({...})", "Obj.of({...})", "Obj.empty()"],
      transform: [
        ".set(k, v)",
        ".assign(partial)",
        ".merge(obj)",
        ".when(cond, partial)",
        ".omit(...keys)",
        ".pick(...keys)",
        ".map(f)",
        ".flatMap(f)",
      ],
      extract: [".get(k)", ".value()", ".keys()", ".values()", ".entries()", ".fold(n, s)", ".match({Obj})"],
      check: [".has(k)", ".isEmpty", ".size"],
    },
  },

  Map: {
    description: "Immutable key-value store",
    interfaces: mergeInterfaces("Map"),
    methods: {
      create: ["Map([[k, v], ...])", "Map.of([k, v], ...)", "Map.empty()"],
      transform: [".set(k, v)", ".delete(k)", ".map(f)", ".filter(p)", ".add(k, v)"],
      extract: [".get(k)", ".keys()", ".values()", ".entries()", ".fold(z, f)"],
      check: [".has(k)", ".isEmpty", ".size"],
    },
  },

  Lazy: {
    description:
      "Deferred computation with memoization. Note: `serialize()` and `toValue()` FORCE the thunk (visible side effect) since a closure cannot be JSON-serialized — there is no representable 'unevaluated post-serialize' state. Thunk failures are captured via SerializedError and rethrown on access after fromJSON.",
    interfaces: mergeInterfaces("Lazy"),
    methods: {
      create: [
        "Lazy(() => expr)",
        "Lazy.fromValue(value) — wrap a non-deferred value",
        "Lazy.evaluated(value) — reads as 'already-forced'; used by fromJSON",
        "Lazy.fail(error) — Lazy that throws on access",
      ],
      transform: [".map(f)", ".flatMap(f)"],
      extract: [".fold(n, s)", ".orElse(d)", ".orThrow()", ".get()", ".toJSON()", "Lazy.fromJSON(json)"],
      check: [".isEvaluated"],
    },
  },

  LazyList: {
    description: "Lazy sequences for large/infinite data",
    // LazyList declares Functor/Monad/Iterable inline rather than via extends.
    interfaces: mergeInterfaces("LazyList", "Functor", "Monad", "Iterable"),
    methods: {
      create: ["LazyList.from(iter)", "LazyList.range(start, end)", "LazyList.infinite(f)", "LazyList.fromJSON(json)"],
      transform: [
        ".map(f)",
        ".filter(p)",
        ".take(n)",
        ".takeRight(n)",
        ".drop(n)",
        ".takeWhile(p)",
        ".dropWhile(p)",
        ".concat(ll)",
        ".reverse()",
        ".distinct()",
        ".zip(ll)",
        ".zipWithIndex()",
      ],
      extract: [".head", ".headOption", ".tail", ".last", ".lastOption", ".init", ".toArray()", ".toJSON()"],
      check: [".isEmpty"],
    },
  },

  Task: {
    description:
      "Async operations with cancellation and progress tracking. Returns TaskOutcome<T> (Ok/Err) which implements Functor, AsyncMonad, Foldable, Extractable, Serializable",
    interfaces: mergeInterfaces("Task"),
    methods: {
      create: [
        "Task(params).Async(fn, errFn)",
        "Task(params).Sync(fn, errFn)",
        "Task.ok(value)",
        "Task.err(error)",
        "Task.fromEither(either)",
        "Task.fromTry(try)",
        "Task.fromPromise(fn)",
        "Task.fromNodeCallback(fn)",
        "Task.fromJSON(json) — reconstruct from serialize() output",
      ],
      transform: [".map(f)", ".flatMap(f)", ".mapError(f)", ".recover(v)", ".recoverWith(f)"],
      extract: [
        ".fold(onErr, onOk)",
        ".match({Ok, Err})",
        ".orElse(v)",
        ".orThrow()",
        ".toEither()",
        ".toOption()",
        ".toJSON()",
      ],
      other: [
        "Task.cancellable(fn)",
        "Task.withProgress(fn, onProgress)",
        "Task.race(tasks, timeout?)",
        "Task.getErrorChain(error)",
        "Task.formatErrorChain(error)",
      ],
    },
  },

  IO: {
    description: "Lazy effect type with typed errors and dependency injection",
    interfaces: ["Functor", "Monad", "Foldable", "Matchable"],
    methods: {
      create: [
        "IO(() => v)",
        "IO.succeed(v)",
        "IO.fail(e)",
        "IO.sync(f)",
        "IO.async(f)",
        "IO.tryPromise({try, catch})",
        "IO.fromEither(e)",
        "IO.fromOption(o)",
        "IO.fromTry(t)",
      ],
      transform: [".map(f)", ".flatMap(f)", ".tap(f)", ".mapError(f)", ".recover(v)", ".recoverWith(f)"],
      extract: [
        ".run()",
        ".runOrThrow()",
        ".runSync()",
        ".runSyncOrThrow()",
        ".runExit()",
        ".runOption()",
        ".runTry()",
        ".fold(onErr, onOk)",
        ".match({failure, success})",
      ],
      check: [],
      other: [
        ".catchTag(tag, f)",
        ".catchAll(f)",
        ".retry(n)",
        ".retryWithDelay(n, ms)",
        ".timeout(ms)",
        ".delay(ms)",
        ".zip(io)",
        ".pipe(f)",
        "IO.all([...])",
        "IO.race([...])",
        "IO.bracket(acquire, use, release)",
        "IO.gen(function*() {...})",
        "IO.Do.bind().map()",
        "IO.service(Tag)",
        ".provideService(Tag, impl)",
        ".provideLayer(layer)",
      ],
    },
  },

  Cond: {
    description: "Conditional expression builder - replace if-else chains",
    interfaces: [],
    methods: {
      create: ["Cond<T>()"],
      other: [".case(pred, result)", ".otherwise(result)", ".eval()"],
    },
  },

  Match: {
    description: "Pattern matching - replace switch statements",
    interfaces: [],
    methods: {
      create: ["Match(value)"],
      other: [".case(pattern, result)", ".when(pred, result)", ".default(result)", ".done()"],
    },
  },

  Brand: {
    description: "Nominal typing without runtime overhead",
    interfaces: [],
    methods: {
      create: ["Brand<K, T>(value)"],
      extract: [".unwrap()", ".toString()"],
    },
  },

  ValidatedBrand: {
    description: "Branded types with runtime validation",
    interfaces: [],
    methods: {
      create: ["ValidatedBrand(validator)", ".of(v)", ".from(v)", ".unsafeOf(v)"],
      check: [".is(v)"],
      other: [".refine(validator)"],
    },
  },

  Tuple: {
    description: "Fixed-size typed array",
    interfaces: mergeInterfaces("Tuple", "Typeable", "Valuable", "Iterable"),
    methods: {
      create: ["Tuple([a, b, ...])", "Tuple.of(a, b, ...)", "Tuple.fromJSON(json)"],
      extract: [".first", ".second", ".toArray()", ".toJSON()"],
      transform: [".map(f)"],
    },
  },

  Stack: {
    description: "Immutable LIFO stack",
    interfaces: ["Foldable", "Collection", "Serializable", "Traversable"],
    methods: {
      create: ["Stack()", "Stack.of(...)"],
      transform: [".push(v)", ".pop()"],
      extract: [".peek()", ".toArray()"],
      check: [".isEmpty", ".size"],
    },
  },

  Http: {
    description:
      "HTTP fetch wrapper returning IO<never, HttpError, HttpResponse<T>>. Pass `decode: Decoder<T>` (Either-returning) for typed responses; the deprecated `validate: (data) => T` field is still accepted for throw-pattern back-compat. Request bodies auto-flatten functype ADTs to primitives; `flatten: false` preserves tagged emission for functype-to-functype services. Http.client accepts `beforeRequest` (effectful IO transformer for auth refresh, request IDs, etc.). Composes via .tap/.map/.flatMap/.catchTag/.retry/.timeout.",
    interfaces: [],
    methods: {
      create: [
        "Http.get(url, { decode }?)",
        "Http.post(url, { body, decode }?)",
        "Http.put(url, { body, decode }?)",
        "Http.patch(url, { body, decode }?)",
        "Http.delete(url, { decode }?)",
        "Http.request({ url, decode })",
        "Http.client({ baseUrl, defaultHeaders, fetch, beforeRequest })",
      ],
      transform: [
        ".tap(f)",
        ".map(f)",
        ".flatMap(f)",
        ".mapError(f)",
        ".retry(n)",
        ".retryWithDelay(n, ms)",
        ".timeout(ms)",
      ],
      extract: [".run()", ".runOrThrow()", ".runOption()", ".runTry()", ".runExit()"],
      check: [],
      other: [
        ".catchTag(tag, handler)",
        ".catchAll(handler)",
        ".recover(fallback)",
        "decode: Decoder<T> (Either-returning, structural failures preserved)",
        "validate: (data) => T (deprecated, throws — for back-compat / Zod .parse)",
        "flatten: boolean (default true; false preserves tagged emission)",
        "beforeRequest: (req) => IO<never, HttpError, HttpRequestView>",
      ],
    },
  },

  HttpError: {
    description:
      "Three-variant ADT for HTTP failures: NetworkError | HttpStatusError | DecodeError (also exported as ResponseDecodeError alias)",
    interfaces: [],
    methods: {
      create: [
        "HttpError.networkError(url, method, cause)",
        "HttpError.httpStatusError(url, method, status, statusText, body)",
        "HttpError.decodeError(url, method, body, cause)",
      ],
      check: ["HttpError.isNetworkError(e)", "HttpError.isHttpStatusError(e)", "HttpError.isDecodeError(e)"],
      other: ["HttpError.match(error, { NetworkError, HttpStatusError, DecodeError })"],
    },
  },

  Decoder: {
    description:
      "Either-returning decoder contract: `Decoder<A> = (raw: unknown) => Either<DecoderError, A>`. Bundled combinators for primitives + functype ADTs (Option/Either/List/Map, null-bias). `Decoder.tagged.*` round-trips the `{_tag, value}` shape for functype-to-functype services.",
    interfaces: [],
    methods: {
      create: [
        "Decoder.string / .number / .boolean / .unknown / .nullable(inner)",
        "Decoder.option(inner)",
        "Decoder.either.envelope({ok, err})",
        "Decoder.either.discriminated({tag, leftTag, rightTag}, l, r)",
        "Decoder.list(inner) / .array(inner) / .map(inner)",
        "Decoder.object({k: Decoder<V>, ...}) — accumulates field failures into Composite",
        "Decoder.tagged.option/either/try/list/map/obj(inner?) — round-trips {_tag, value}",
      ],
      other: [
        "Pluggable by construction: any (raw) => Either<DecoderError, T> IS a Decoder<T>",
        "Composes across sources: Decoder.object({a: Decoder.fromZod(s), b: Decoder.option(myAjv)})",
      ],
    },
  },

  DecoderError: {
    description:
      "Recursive ADT for decoder failures: Leaf | Composite. Children mirror the input tree so multi-field failures preserve structural paths. Distinct from `HttpError.DecodeError` — this is the inner structural cause that the HTTP wrapper carries.",
    interfaces: [],
    methods: {
      create: [
        "DecoderError.leaf(path, message, cause?)",
        "DecoderError.composite(path, children: List<DecoderError>)",
      ],
      check: ["DecoderError.isLeaf(e)", "DecoderError.isComposite(e)"],
      other: [
        "DecoderError.match(e, { Leaf, Composite })",
        "DecoderError.prepend(segment, e) — used by combinators to attribute child failures",
        "DecoderError.flatten(e): List<{path, message}> — collect leaves",
        "DecoderError.format(e): string — render tree as multi-line",
      ],
    },
  },

  Serialization: {
    description:
      "Universal `@functype`-marked JSON serialization. `deserialize` walks parsed JSON and reconstructs any functype value found — no type argument needed. Lenient: plain JSON passes through. Strict on unknown markers (defends against Effect/fp-ts `_tag` collision). 1.2.1 adds `toEnvelope`/`fromEnvelope` for nesting inside structured serializers (SuperJSON, DBOS), and `deserializeStrict` for boundaries that require functype on the wire.",
    interfaces: [],
    methods: {
      create: [],
      transform: [
        "Serialization.serialize(value: unknown): string — lenient JSON codec",
        "Serialization.deserialize(json: string): Try<unknown> — lenient; pass-through for unmarked JSON",
        "Serialization.deserializeStrict(json: string): Try<unknown> — Failure if no @functype marker at top level",
        "Serialization.toEnvelope(value: unknown): unknown — parsed JSON shape (for SuperJSON/DBOS custom transformers)",
        "Serialization.fromEnvelope(envelope: unknown): Try<unknown> — inverse of toEnvelope",
      ],
      check: ["Serialization.isFunctypeValue(v): v is Serializable<unknown>"],
      other: [
        "Plain JSON passthrough: non-functype data walks through unchanged (use deserializeStrict to reject)",
        "Strict policy on unknown markers: unknown @functype marker → Try.Failure",
        "Dispatch table covers all 12 Serializable types (Option, Either, Try, List, Set, Map, Obj, Stack, Tuple, LazyList, Lazy, Task)",
        "Algebraic square: serialize ≡ JSON.stringify ∘ toEnvelope; deserialize ≡ fromEnvelope ∘ JSON.parse",
        "No DBOS / SuperJSON facade — consumers wire host serializer in ~8 lines via toEnvelope/fromEnvelope",
      ],
    },
  },

  SerializedError: {
    description:
      "Canonical Error projection used by Try.Failure, Task.Err, Lazy-with-thrown-thunk. Round-trips name + message + stack + cause chain. `e.name === 'TypeError'` survives; `instanceof TypeError` does NOT.",
    interfaces: [],
    methods: {
      create: ["serializeError(err: unknown): SerializedError", "deserializeError(s: SerializedError | string): Error"],
      other: [
        "Shape: { name: string; message: string; stack?: string; cause?: SerializedError | string }",
        "Non-Error throwables (strings, plain objects) projected under name: 'NonErrorThrowable'",
        "Cause chain is recursive — arbitrary nesting depth survives",
      ],
    },
  },
}

export const INTERFACES: Record<string, InterfaceData> = {
  Functor: {
    description: "Transform contained values",
    methods: [".map<B>(f: A => B): Functor<B>"],
  },

  Applicative: {
    extends: "Functor",
    description: "Apply wrapped functions",
    methods: [".ap<B>(ff: Applicative<A => B>): Applicative<B>"],
  },

  Monad: {
    extends: "Applicative",
    description: "Chain operations returning wrapped values",
    methods: [".flatMap<B>(f: A => Monad<B>): Monad<B>"],
  },

  Foldable: {
    description: "Extract via pattern matching",
    methods: [
      ".fold<B>(empty: () => B, f: A => B): B",
      ".foldLeft<B>(z: B, op: (B, A) => B): B",
      ".foldRight<B>(z: B, op: (A, B) => B): B",
    ],
  },

  Extractable: {
    description: "Get contained value with fallback",
    methods: [
      ".orElse(d: T): T",
      ".orThrow(e?: Error): T",
      ".expect(handler: (e?) => never): T",
      ".orNull(): T | null",
      ".orUndefined(): T | undefined",
    ],
  },

  Matchable: {
    description: "Pattern match on type variants",
    methods: [".match<R>(patterns: Record<Tag, Handler>): R"],
  },

  Traversable: {
    description: "Iterate and check contents",
    methods: [".size: number", ".isEmpty: boolean", ".contains(v: A): boolean", ".reduce<B>(f, init): B"],
  },

  Collection: {
    description: "Collection operations",
    methods: [".toArray(): A[]", ".forEach(f: A => void): void"],
  },

  Serializable: {
    description: "Convert to string formats",
    methods: [".serialize().toJSON(): string", ".serialize().toYAML(): string"],
  },
}

export const CATEGORIES = {
  Core: ["Option", "Either", "Try", "Obj"],
  Collection: ["List", "Set", "Map", "LazyList", "Tuple", "Stack"],
  Effect: ["IO", "Task", "Http", "HttpError", "Decoder", "DecoderError"],
  Utility: ["Lazy", "Cond", "Match", "Brand", "ValidatedBrand"],
  Serialization: ["Serialization", "SerializedError"],
}
