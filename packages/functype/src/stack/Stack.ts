import { Companion } from "@/companion/Companion"
import type { Foldable } from "@/foldable/Foldable"
import { base64ToUtf8 } from "@/internal/base64"
import { type A, define, type Mutable } from "@/internal/define"
import { List } from "@/list/List"
import type { Matchable } from "@/matchable"
import { Option } from "@/option/Option"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
import { createSerializer, expectMarker, type ParsedEnvelope } from "@/serialization"
import type { Traversable } from "@/traversable/Traversable"
import { reduceRightWiden, reduceWiden, type Widen } from "@/typeclass"
import type { Type } from "@/types"
import type { Valuable } from "@/valuable/Valuable"

/**
 * Stack data structure - Last In, First Out (LIFO)
 * Implements the Traversable interface for working with ordered collections
 */
// Note: Stack is structurally covariant in A (all methods use A in covariance-safe
// positions), but TS variance annotations can't be applied to intersection type
// aliases. Subtyping still works via structural checks.
export type Stack<A extends Type> = {
  readonly [Symbol.toStringTag]: string
  /**
   * Push a value onto the top of the stack. The value may be a wider type;
   * the result widens to `Stack<A | B>` (Scala: `:+[B >: A]`).
   * @param value - The value to push
   * @returns A new Stack with the value added
   */
  push<B extends Type>(value: B): Stack<A | B>

  /**
   * Remove and return the top value from the stack
   * @returns A tuple containing the new Stack and the value
   */
  pop(): [Stack<A>, Option<A>]

  /**
   * Return the top value without removing it
   * @returns The top value wrapped in an Option
   */
  peek(): Option<A>

  /**
   * Transforms each element in the stack using the provided function
   * @param f - The mapping function
   * @returns A new Stack with transformed elements
   */
  map<B extends Type>(f: (a: A) => B): Stack<B>

  /**
   * Maps each element to a Stack and flattens the result
   * @param f - The mapping function returning a Stack
   * @returns A new flattened Stack
   */
  flatMap<B extends Type>(f: (a: A) => Stack<B>): Stack<B>

  /**
   * Applies a Stack of functions to this Stack
   * @param ff - Stack of functions to apply
   * @returns A new Stack with applied functions
   */
  ap<B extends Type>(ff: Stack<(value: A) => B>): Stack<B>

  /**
   * Maps each element to an async Stack and flattens the result
   * @param f - The async mapping function returning a Stack
   * @returns A promise of the new flattened Stack
   */
  flatMapAsync<B extends Type>(f: (value: A) => PromiseLike<Stack<B>>): PromiseLike<Stack<B>>

  /**
   * Convert the stack to a List
   * @returns A List containing all elements
   */
  toList(): List<A>

  /**
   * Convert the stack to an array
   * @returns An array of all elements
   */
  toArray(): A[]

  /**
   * Returns a string representation of the stack
   * @returns A string representation
   */
  toString(): string

  /**
   * Left-associative fold over all elements using an initial value and combining function.
   */
  fold<B>(initial: B, fn: (acc: B, a: A) => B): B

  /**
   * Pattern matches over the Stack, applying a handler function based on whether it's empty
   * @param patterns - Object with handler functions for Empty and NonEmpty variants
   * @returns The result of applying the matching handler function
   */
  match<R>(patterns: { Empty: () => R; NonEmpty: (values: A[]) => R }): R
} & Traversable<A> &
  Valuable<"Stack", A[]> &
  Serializable<A> &
  Pipe<A[]> &
  Foldable<A> &
  Matchable<A[], "Empty" | "NonEmpty">

/**
 * A Stack's own data: its tag and its items, bottom first, which nothing changes after the Stack is
 * built. @internal
 */
type StackOf<A extends Type> = Stack<A> & {
  readonly value: readonly A[]
}

/* eslint-disable functional/immutable-data -- methods build fresh arrays, and wrap fills in the Stack it just created */

/** Every Stack shares these methods (#276 §14). `this.value` is the Stack's own items, bottom first. */
const StackProto = define<StackOf<A>, "_tag" | "value">()("Stack", {
  [Symbol.toStringTag]: "Stack",

  get size() {
    return this.value.length
  },

  get isEmpty() {
    return this.value.length === 0
  },

  contains(value) {
    return (this.value as readonly unknown[]).includes(value)
  },

  reduce<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B> {
    if (this.value.length === 0) {
      throw new Error("Cannot reduce an empty stack")
    }
    return reduceWiden<A, Widen<A, B>>(this.value, op)
  },

  reduceRight<B = A>(op: (b: Widen<A, B>, a: Widen<A, B>) => Widen<A, B>): Widen<A, B> {
    if (this.value.length === 0) {
      throw new Error("Cannot reduce an empty stack")
    }
    return reduceRightWiden<A, Widen<A, B>>(this.value, op)
  },

  push<B extends Type>(value: B): Stack<A | B> {
    return wrap<A | B>([...this.value, value])
  },

  pop(): [Stack<A>, Option<A>] {
    if (this.value.length === 0) {
      return [this, Option<A>(null)]
    }
    return [wrap(this.value.slice(0, -1)), Option<A>(this.value[this.value.length - 1])]
  },

  peek() {
    return Option<A>(this.value[this.value.length - 1])
  },

  map<B extends Type>(f: (a: A) => B): Stack<B> {
    return wrap(this.value.map(f))
  },

  flatMap<B extends Type>(f: (a: A) => Stack<B>): Stack<B> {
    // Bottom to top, so each result's items keep their order
    return wrap(this.value.flatMap((a) => f(a).toArray()))
  },

  ap<B extends Type>(ff: Stack<(value: A) => B>): Stack<B> {
    const fs = ff.toArray()
    return wrap(this.value.flatMap((a) => fs.map((f) => f(a))))
  },

  async flatMapAsync<B extends Type>(f: (value: A) => PromiseLike<Stack<B>>): Promise<Stack<B>> {
    const results = await Promise.all(this.value.map(async (a) => await f(a)))
    return wrap(results.flatMap((stack) => stack.toArray()))
  },

  toList() {
    return List<A>(this.value)
  },

  toArray() {
    return [...this.value]
  },

  toString() {
    return `Stack(${this.value.join(", ")})`
  },

  fold<B>(initial: B, fn: (acc: B, a: A) => B): B {
    return this.value.reduce(fn, initial)
  },

  foldLeft<B>(z: B) {
    return (op: (b: B, a: A) => B): B => this.value.reduce(op, z)
  },

  foldRight<B>(z: B) {
    return (op: (a: A, b: B) => B): B => this.value.reduceRight((acc, value) => op(value, acc), z)
  },

  match<R>(patterns: { Empty: () => R; NonEmpty: (values: A[]) => R }): R {
    return this.value.length === 0 ? patterns.Empty() : patterns.NonEmpty([...this.value])
  },

  toValue() {
    return { _tag: "Stack" as const, value: [...this.value] }
  },

  toJSON() {
    return { "@functype": "Stack" as const, _tag: "Stack" as const, value: [...this.value] }
  },

  pipe<U>(f: (value: A[]) => U): U {
    return f([...this.value])
  },

  serialize() {
    return createSerializer("Stack", this.value)
  },
})

/**
 * Builds a Stack around an array it now owns: nothing may change the array afterwards. Frozen, as
 * collections have been since 1.27.0 (#276 §14 Rules).
 */
const wrap = <A extends Type>(items: readonly A[]): Stack<A> => {
  // The one cast: a prototype checked at the opaque A works for every A.
  const stack = Object.create(StackProto) as Mutable<StackOf<A>>
  stack._tag = "Stack"
  stack.value = items
  return Object.freeze(stack)
}

/* eslint-enable functional/immutable-data */

/** Copies `values`, so a later change to the caller's array can't reach the Stack. */
const StackConstructor = <A extends Type>(values: readonly A[] = []): Stack<A> => wrap([...values])

/** Rebuilds a Stack from a parsed envelope. */
const stackFromEnvelope = <A>(parsed: ParsedEnvelope, method: string): Stack<A> => {
  expectMarker(parsed, "Stack", method)
  return Stack<A>((parsed.value ?? []) as A[])
}

const StackCompanion = {
  /**
   * Creates an empty stack
   * @returns An empty Stack instance
   */
  empty: <A extends Type>(): Stack<A> => wrap<A>([]),

  /**
   * Creates a Stack from values, like `Stack([...values])`
   * @example
   * Stack.of(1, 2, 3) // same as Stack([1, 2, 3])
   * @param values - The values to create the stack with
   * @returns A Stack holding the values
   */
  of: <A extends Type>(...values: A[]): Stack<A> => wrap<A>(values),

  /**
   * Creates a Stack from JSON string
   * @param json - The JSON string
   * @returns Stack instance
   */
  fromJSON: <A>(json: string): Stack<A> => stackFromEnvelope<A>(JSON.parse(json) as ParsedEnvelope, "fromJSON"),

  /**
   * Creates a Stack from binary string
   * @param binary - The binary string
   * @returns Stack instance
   */
  fromBinary: <A>(binary: string): Stack<A> => {
    const json = base64ToUtf8(binary)
    return StackCompanion.fromJSON<A>(json)
  },
}

export const Stack = Companion(StackConstructor, StackCompanion)
