/**
 * Curated API data for CLI output, optimized for LLM consumption
 */

import pkg from "../../package.json"

export const VERSION = pkg.version

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
    interfaces: ["Functor", "Monad", "Foldable", "Extractable", "Matchable", "Serializable", "Traversable"],
    methods: {
      create: ["Option(v)", "Option.none()", "Some(v)", "None()"],
      transform: [".map(f)", ".flatMap(f)", ".filter(p)", ".ap(ff)"],
      extract: [".fold(n, s)", ".orElse(d)", ".orThrow()", ".orNull()", ".match({Some, None})"],
      check: [".isSome", ".isNone", ".isDefined", ".isEmpty"],
    },
  },

  Either: {
    description: "Error handling with Left (error) or Right (success)",
    interfaces: ["Functor", "Monad", "Foldable", "Traversable", "PromiseLike"],
    methods: {
      create: ["Right(v)", "Left(e)", "Either.right(v)", "Either.left(e)"],
      transform: [".map(f)", ".flatMap(f)", ".mapLeft(f)", ".swap()"],
      extract: [".fold(l, r)", ".orElse(d)", ".orThrow()", ".match({Left, Right})"],
      check: [".isRight", ".isLeft"],
    },
  },

  Try: {
    description: "Wrap operations that may throw - Success<T> or Failure",
    interfaces: ["Functor", "Monad", "Foldable", "Extractable", "Matchable", "Serializable", "Traversable"],
    methods: {
      create: ["Try(() => expr)", "Success(v)", "Failure(e)"],
      transform: [".map(f)", ".flatMap(f)", ".recover(f)", ".recoverWith(f)"],
      extract: [".fold(f, s)", ".orElse(d)", ".orThrow()", ".toOption()", ".toEither()"],
      check: [".isSuccess", ".isFailure"],
    },
  },

  List: {
    description: "Immutable array with functional operations",
    interfaces: ["Functor", "Monad", "Foldable", "Collection", "Serializable", "Traversable"],
    methods: {
      create: ["List([...])", "List.of(...)", "List.empty()"],
      transform: [".map(f)", ".flatMap(f)", ".filter(p)", ".take(n)", ".drop(n)"],
      extract: [".fold(z, f)", ".reduce(f)", ".head", ".tail", ".toArray()"],
      check: [".isEmpty", ".nonEmpty", ".size", ".contains(v)"],
    },
  },

  Set: {
    description: "Immutable set of unique values",
    interfaces: ["Functor", "Foldable", "Collection", "Serializable", "Traversable"],
    methods: {
      create: ["Set([...])", "Set.of(...)", "Set.empty()"],
      transform: [".map(f)", ".filter(p)", ".union(s)", ".intersection(s)", ".difference(s)"],
      extract: [".fold(z, f)", ".toArray()"],
      check: [".has(v)", ".isEmpty", ".size"],
    },
  },

  Map: {
    description: "Immutable key-value store",
    interfaces: ["SafeTraversable", "Collection", "Serializable"],
    methods: {
      create: ["Map([...])", "Map.of(...)", "Map.empty()"],
      transform: [".set(k, v)", ".delete(k)", ".map(f)", ".filter(p)"],
      extract: [".get(k)", ".keys()", ".values()", ".entries()", ".fold(z, f)"],
      check: [".has(k)", ".isEmpty", ".size"],
    },
  },

  Lazy: {
    description: "Deferred computation with memoization",
    interfaces: ["Functor", "Monad", "Foldable", "Extractable", "Serializable", "Traversable"],
    methods: {
      create: ["Lazy(() => expr)"],
      transform: [".map(f)", ".flatMap(f)"],
      extract: [".fold(n, s)", ".orElse(d)", ".orThrow()", ".get()"],
      check: [".isEvaluated"],
    },
  },

  LazyList: {
    description: "Lazy sequences for large/infinite data",
    interfaces: ["Functor", "Monad", "Iterable"],
    methods: {
      create: ["LazyList.from(iter)", "LazyList.range(start, end)", "LazyList.infinite(f)"],
      transform: [".map(f)", ".filter(p)", ".take(n)", ".drop(n)", ".concat(ll)"],
      extract: [".head", ".tail", ".toArray()"],
      check: [".isEmpty"],
    },
  },

  Task: {
    description: "Async operations with cancellation and progress",
    interfaces: [],
    methods: {
      create: ["Task.of(v)", "Task.from(promise)", "Task.sync(f)", "Task.async(f)"],
      transform: [".map(f)", ".flatMap(f)", ".mapError(f)"],
      extract: [".run()", ".cancel()"],
      other: [".onProgress(cb)", ".onCancel(cb)"],
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

  FPromise: {
    description: "Enhanced Promise with functional methods",
    interfaces: ["PromiseLike"],
    methods: {
      create: ["FPromise.of(v)", "FPromise.from(promise)"],
      transform: [".map(f)", ".flatMap(f)", ".mapError(f)", ".recover(f)"],
      extract: [".toPromise()", ".cancel()"],
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
    interfaces: ["Typeable", "Valuable", "Iterable"],
    methods: {
      create: ["Tuple([a, b, ...])", "Tuple.of(a, b, ...)"],
      extract: [".first", ".second", ".toArray()"],
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
    methods: [".orElse(d: T): T", ".orThrow(e?: Error): T", ".orNull(): T | null", ".orUndefined(): T | undefined"],
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
  Core: ["Option", "Either", "Try"],
  Collection: ["List", "Set", "Map", "LazyList", "Tuple", "Stack"],
  Effect: ["IO", "Task", "FPromise"],
  Utility: ["Lazy", "Cond", "Match", "Brand", "ValidatedBrand"],
}
