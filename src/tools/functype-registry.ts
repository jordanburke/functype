/**
 * Registry of functype data structures with metadata for AI agent lookups
 */

export interface FunctypeInfo {
  name: string
  description: string
  category: "Core" | "Collection" | "Async" | "Utility"
  sourcePath: string
  testPath?: string
  examplePath?: string
  implements: string[]
  keyMethods: string[]
  relatedTypes?: string[]
  commonUseCases: string[]
}

export const functypeRegistry: Record<string, FunctypeInfo> = {
  Option: {
    name: "Option",
    description: "Represents a value that may or may not exist. Safer alternative to null/undefined.",
    category: "Core",
    sourcePath: "src/option/Option.ts",
    testPath: "test/option/Option.spec.ts",
    implements: ["Functor", "Monad", "Foldable", "Extractable", "Matchable", "Serializable", "Traversable"],
    keyMethods: ["map", "flatMap", "fold", "getOrElse", "filter", "orElse"],
    relatedTypes: ["Either", "Try"],
    commonUseCases: [
      "Handling nullable values",
      "Chaining operations on optional data",
      "Avoiding null pointer exceptions",
      "Optional configuration values",
    ],
  },

  List: {
    name: "List",
    description: "Immutable array with functional operations. Better than native arrays for FP.",
    category: "Collection",
    sourcePath: "src/list/List.ts",
    testPath: "test/list/List.spec.ts",
    implements: [
      "Functor",
      "Monad",
      "Foldable",
      "Collection",
      "ContainerOps",
      "CollectionOps",
      "Serializable",
      "Traversable",
    ],
    keyMethods: ["map", "filter", "flatMap", "fold", "reduce", "append", "prepend", "head", "tail", "take", "drop"],
    relatedTypes: ["LazyList", "Set"],
    commonUseCases: [
      "Immutable array operations",
      "Data transformation pipelines",
      "Functional collection processing",
      "Safe array manipulation",
    ],
  },

  Either: {
    name: "Either",
    description: "Represents a value with two possible types (Left for errors, Right for success).",
    category: "Core",
    sourcePath: "src/either/Either.ts",
    testPath: "test/either/Either.spec.ts",
    implements: ["Functor", "Monad", "Foldable", "Traversable", "PromiseLike"],
    keyMethods: ["map", "flatMap", "fold", "mapLeft", "swap", "isRight", "isLeft"],
    relatedTypes: ["Option", "Try"],
    commonUseCases: [
      "Error handling without exceptions",
      "Validation with error accumulation",
      "Railway-oriented programming",
      "Branching logic",
    ],
  },

  Try: {
    name: "Try",
    description: "Represents a computation that may fail with an exception.",
    category: "Core",
    sourcePath: "src/try/Try.ts",
    testPath: "test/try/Try.spec.ts",
    implements: ["Functor", "Monad", "Foldable", "Extractable", "Matchable", "Serializable", "Traversable"],
    keyMethods: ["map", "flatMap", "fold", "recover", "recoverWith", "toOption", "toEither"],
    relatedTypes: ["Option", "Either"],
    commonUseCases: [
      "Wrapping operations that may throw",
      "JSON parsing",
      "File operations",
      "API calls that might fail",
    ],
  },

  Map: {
    name: "Map",
    description: "Immutable key-value map with functional operations.",
    category: "Collection",
    sourcePath: "src/map/Map.ts",
    testPath: "test/map/Map.spec.ts",
    implements: ["SafeTraversable", "Collection", "Serializable"],
    keyMethods: ["get", "set", "has", "delete", "map", "filter", "fold", "keys", "values"],
    relatedTypes: ["List", "Set"],
    commonUseCases: ["Immutable dictionaries", "Configuration objects", "Caching", "Lookup tables"],
  },

  Set: {
    name: "Set",
    description: "Immutable set of unique values with functional operations.",
    category: "Collection",
    sourcePath: "src/set/Set.ts",
    testPath: "test/set/Set.spec.ts",
    implements: ["Functor", "Foldable", "Collection", "ContainerOps", "CollectionOps", "Serializable", "Traversable"],
    keyMethods: ["add", "delete", "has", "map", "filter", "union", "intersection", "difference"],
    relatedTypes: ["List", "Map"],
    commonUseCases: [
      "Unique value collections",
      "Set operations (union, intersection)",
      "Removing duplicates",
      "Membership testing",
    ],
  },

  Lazy: {
    name: "Lazy",
    description: "Represents a lazily evaluated value (computed on first access).",
    category: "Utility",
    sourcePath: "src/lazy/Lazy.ts",
    testPath: "test/lazy/Lazy.spec.ts",
    implements: ["Functor", "Monad", "Foldable", "Extractable", "Serializable", "Traversable"],
    keyMethods: ["map", "flatMap", "get", "fold"],
    relatedTypes: ["LazyList"],
    commonUseCases: ["Deferred computation", "Expensive calculations", "Circular dependencies", "Memoization"],
  },

  LazyList: {
    name: "LazyList",
    description: "Lazily evaluated list for infinite sequences or large datasets.",
    category: "Collection",
    sourcePath: "src/list/LazyList.ts",
    testPath: "test/list/LazyList.spec.ts",
    implements: ["Functor", "Monad", "Iterable"],
    keyMethods: ["take", "drop", "map", "filter", "head", "tail", "concat"],
    relatedTypes: ["List", "Lazy"],
    commonUseCases: ["Infinite sequences", "Stream processing", "Large file processing", "Generator-like behavior"],
  },

  FPromise: {
    name: "FPromise",
    description: "Functional promise with better error handling and cancellation.",
    category: "Async",
    sourcePath: "src/fpromise/FPromise.ts",
    testPath: "test/fpromise/FPromise.spec.ts",
    implements: ["PromiseLike"],
    keyMethods: ["map", "flatMap", "mapError", "recover", "cancel", "toPromise"],
    relatedTypes: ["Task", "Either"],
    commonUseCases: [
      "Async operations with cancellation",
      "Better Promise error handling",
      "Async data pipelines",
      "HTTP requests",
    ],
  },

  Task: {
    name: "Task",
    description: "Represents an async computation with error handling.",
    category: "Async",
    sourcePath: "src/task/Task.ts",
    implements: [],
    keyMethods: ["run", "map", "flatMap", "mapError"],
    relatedTypes: ["FPromise", "Either"],
    commonUseCases: ["Async workflows", "Side effects management", "Deferred async operations", "Complex async chains"],
  },

  Cond: {
    name: "Cond",
    description: "Conditional expression builder for avoiding if-else chains.",
    category: "Utility",
    sourcePath: "src/cond/Cond.ts",
    testPath: "test/cond/Cond.spec.ts",
    implements: [],
    keyMethods: ["case", "otherwise", "match"],
    relatedTypes: ["Match"],
    commonUseCases: ["Complex conditional logic", "Avoiding nested if-else", "Pattern-like matching", "Guard clauses"],
  },

  Match: {
    name: "Match",
    description: "Pattern matching for TypeScript, similar to switch but more powerful.",
    category: "Utility",
    sourcePath: "src/match/Match.ts",
    testPath: "test/match/Match.spec.ts",
    implements: [],
    keyMethods: ["case", "default", "done", "when"],
    relatedTypes: ["Cond"],
    commonUseCases: ["Pattern matching", "Exhaustive checking", "Type narrowing", "Complex switch logic"],
  },

  Brand: {
    name: "Brand",
    description: "Nominal typing for TypeScript with instance methods for type safety without runtime overhead.",
    category: "Utility",
    sourcePath: "src/branded/Brand.ts",
    testPath: "test/branded/branded.spec.ts",
    implements: [],
    keyMethods: ["unbrand", "unwrap", "toString"],
    relatedTypes: ["ValidatedBrand"],
    commonUseCases: ["Nominal typing", "Type safety", "Domain modeling", "Preventing type confusion"],
  },

  ValidatedBrand: {
    name: "ValidatedBrand",
    description: "Branded types with runtime validation using Option/Either for safe value creation.",
    category: "Utility",
    sourcePath: "src/branded/ValidatedBrand.ts",
    testPath: "test/branded/ValidatedBrand.spec.ts",
    implements: [],
    keyMethods: ["of", "from", "unsafeOf", "is", "refine"],
    relatedTypes: ["Brand", "Either", "Option"],
    commonUseCases: ["Runtime type validation", "Domain modeling", "Email/URL validation", "Custom type constraints"],
  },

  Tuple: {
    name: "Tuple",
    description: "Fixed-size immutable array with type safety for each position.",
    category: "Collection",
    sourcePath: "src/tuple/Tuple.ts",
    testPath: "test/tuple/Tuple.spec.ts",
    implements: ["Typeable", "Valuable", "Iterable"],
    keyMethods: ["first", "second", "map", "toArray"],
    relatedTypes: ["List"],
    commonUseCases: ["Fixed-size collections", "Multiple return values", "Coordinate pairs", "Key-value pairs"],
  },

  Stack: {
    name: "Stack",
    description: "Immutable LIFO (Last In, First Out) stack data structure.",
    category: "Collection",
    sourcePath: "src/stack/Stack.ts",
    testPath: "test/stack/Stack.spec.ts",
    implements: ["Foldable", "Collection", "Serializable", "Traversable"],
    keyMethods: ["push", "pop", "peek", "isEmpty"],
    relatedTypes: ["List"],
    commonUseCases: ["LIFO operations", "Undo/redo functionality", "Expression evaluation", "Backtracking algorithms"],
  },
}
