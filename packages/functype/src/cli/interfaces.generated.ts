/**
 * Auto-generated interface lists derived from each type's `extends` chain.
 *
 * DO NOT EDIT MANUALLY. Run `pnpm generate:interfaces` to regenerate.
 *
 * Each entry is the source-of-truth floor for the corresponding TYPES entry
 * in src/cli/data.ts — data.ts may add entries for methods declared inline
 * (e.g. List.map is inline rather than via `extends Functor`) but cannot
 * drop any of these. The data-sync spec enforces that contract.
 */

export const GENERATED_INTERFACES = {
  Option: [
    "Applicative",
    "AsyncMonad",
    "Doable",
    "Extractable",
    "Foldable",
    "Functor",
    "Matchable",
    "Monad",
    "Promisable",
    "Reshapeable",
    "Serializable",
    "Traversable",
  ],
  Either: [
    "Applicative",
    "AsyncMonad",
    "Doable",
    "Extractable",
    "Foldable",
    "Functor",
    "Monad",
    "Promisable",
    "Reshapeable",
    "Serializable",
  ],
  Try: [
    "Applicative",
    "AsyncMonad",
    "Doable",
    "Extractable",
    "Foldable",
    "Functor",
    "Monad",
    "Promisable",
    "Reshapeable",
    "Serializable",
  ],
  List: ["Applicative", "Collection", "Doable", "Foldable", "Functor", "Iterable", "Reshapeable", "Serializable"],
  Set: ["Applicative", "Collection", "Foldable", "Functor", "Iterable", "Serializable"],
  Map: ["Collection", "Foldable", "Iterable", "KVTraversable", "Serializable"],
  Obj: ["Doable", "Extractable", "Foldable", "Matchable", "Promisable", "Reshapeable", "Serializable"],
  Lazy: ["Applicative", "AsyncMonad", "Extractable", "Foldable", "Functor", "Monad", "Serializable", "Traversable"],
  LazyList: ["Foldable", "Serializable"],
  Tuple: ["Foldable", "Serializable"],
} as const

export type GeneratedTypeName = keyof typeof GENERATED_INTERFACES
