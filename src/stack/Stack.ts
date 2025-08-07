import { Companion } from "@/companion/Companion"
import type { Foldable } from "@/foldable/Foldable"
import { List } from "@/list/List"
import type { Matchable } from "@/matchable"
import { Option } from "@/option/Option"
import type { Pipe } from "@/pipe"
import type { Serializable } from "@/serializable/Serializable"
import type { Traversable } from "@/traversable/Traversable"
import type { Type } from "@/types"
import type { Valuable } from "@/valuable/Valuable"

/**
 * Stack data structure - Last In, First Out (LIFO)
 * Implements the Traversable interface for working with ordered collections
 */
export type Stack<A extends Type> = {
  /**
   * Push a value onto the top of the stack
   * @param value - The value to push
   * @returns A new Stack with the value added
   */
  push(value: A): Stack<A>

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
 * Creates a new Stack instance
 * @param values - Initial values for the stack (last item will be at the top)
 * @returns A new Stack instance
 */
const StackObject = <A extends Type>(values: A[] = []): Stack<A> => {
  const _tag = "Stack"
  const items = [...values] // Create a copy to ensure immutability

  // Implementation of Traversable interface
  const size = (): number => items.length
  const isEmpty = (): boolean => items.length === 0

  const contains = (value: A): boolean => items.includes(value)

  const reduce = (f: (prev: A, curr: A) => A): A => {
    if (items.length === 0) {
      throw new Error("Cannot reduce an empty stack")
    }
    return items.reduce(f)
  }

  const reduceRight = (f: (prev: A, curr: A) => A): A => {
    if (items.length === 0) {
      throw new Error("Cannot reduce an empty stack")
    }
    return items.reduceRight(f)
  }

  // Stack-specific operations
  const push = (value: A): Stack<A> => {
    return StackObject<A>([...items, value])
  }

  const pop = (): [Stack<A>, Option<A>] => {
    if (isEmpty()) {
      return [StackObject<A>([]), Option<A>(null)]
    }

    const newItems = [...items]
    const popped = newItems.pop()
    return [StackObject<A>(newItems), Option<A>(popped as A)]
  }

  const peek = (): Option<A> => {
    if (isEmpty()) {
      return Option<A>(null)
    }
    return Option<A>(items[items.length - 1])
  }

  // Functor implementation
  const map = <B extends Type>(f: (a: A) => B): Stack<B> => {
    return StackObject<B>(items.map(f))
  }

  const flatMap = <B extends Type>(f: (a: A) => Stack<B>): Stack<B> => {
    if (isEmpty()) {
      return StackObject<B>([])
    }

    // Process items from bottom to top to maintain the order
    return items.reduce((acc: Stack<B>, current: A) => {
      const result = f(current)
      return result.toArray().reduce((inner, val) => inner.push(val), acc)
    }, StackObject<B>([]))
  }

  const ap = <B extends Type>(ff: Stack<(value: A) => B>): Stack<B> => {
    const result: B[] = []
    items.forEach((a) => {
      ff.toArray().forEach((f) => {
        result.push(f(a))
      })
    })
    return StackObject<B>(result)
  }

  const flatMapAsync = async <B extends Type>(f: (value: A) => PromiseLike<Stack<B>>): Promise<Stack<B>> => {
    if (isEmpty()) {
      return StackObject<B>([])
    }

    const results = await Promise.all(items.map(async (a) => await f(a)))
    return results.reduce((acc: Stack<B>, current: Stack<B>) => {
      return current.toArray().reduce((inner, val) => inner.push(val), acc)
    }, StackObject<B>([]))
  }

  // Conversion methods
  const toList = (): List<A> => List<A>(items)

  const toArray = (): A[] => [...items]

  const toString = (): string => `Stack(${items.join(", ")})`

  // Fold implementations
  const fold = <U extends Type>(onEmpty: () => U, onValue: (value: A) => U): U => {
    if (isEmpty()) {
      return onEmpty()
    }
    const lastItem = items[items.length - 1]
    // If the last item is undefined, return the empty case to be safe
    return lastItem !== undefined ? onValue(lastItem) : onEmpty()
  }

  const foldLeft =
    <B>(z: B) =>
    (op: (b: B, a: A) => B): B => {
      return items.reduce(op, z)
    }

  const foldRight =
    <B>(z: B) =>
    (op: (a: A, b: B) => B): B => {
      return items.reduceRight((acc, value) => op(value, acc), z)
    }

  // Pattern matching
  const match = <R>(patterns: { Empty: () => R; NonEmpty: (values: A[]) => R }): R => {
    return isEmpty() ? patterns.Empty() : patterns.NonEmpty([...items])
  }

  return {
    _tag,
    get size() {
      return size()
    },
    get isEmpty() {
      return isEmpty()
    },
    contains,
    reduce,
    reduceRight,
    push,
    pop,
    peek,
    map,
    flatMap,
    ap,
    flatMapAsync,
    toList,
    toArray,
    toString,
    fold,
    foldLeft,
    foldRight,
    match,
    toValue: () => ({ _tag: "Stack", value: items }),
    pipe: <U>(f: (value: A[]) => U) => f([...items]),
    serialize: () => {
      return {
        toJSON: () => JSON.stringify({ _tag: "Stack", value: items }),
        toYAML: () => `_tag: Stack\nvalue: ${JSON.stringify(items)}`,
        toBinary: () => Buffer.from(JSON.stringify({ _tag: "Stack", value: items })).toString("base64"),
      }
    },
  }
}

const StackConstructor = <A extends Type>(values: A[] = []): Stack<A> => StackObject(values)

const StackCompanion = {
  /**
   * Creates an empty stack
   * @returns An empty Stack instance
   */
  empty: <A extends Type>(): Stack<A> => StackObject<A>([]),

  /**
   * Creates a Stack from a single value
   * @param value - The value to create a stack with
   * @returns A Stack with a single value
   */
  of: <A extends Type>(value: A): Stack<A> => StackObject<A>([value]),

  /**
   * Creates a Stack from JSON string
   * @param json - The JSON string
   * @returns Stack instance
   */
  fromJSON: <A>(json: string): Stack<A> => {
    const parsed = JSON.parse(json)
    return Stack<A>(parsed.value)
  },

  /**
   * Creates a Stack from YAML string
   * @param yaml - The YAML string
   * @returns Stack instance
   */
  fromYAML: <A>(yaml: string): Stack<A> => {
    const lines = yaml.split("\n")
    const valueStr = lines[1]?.split(": ")[1]
    if (!valueStr) {
      return Stack<A>([])
    }
    const value = JSON.parse(valueStr)
    return Stack<A>(value)
  },

  /**
   * Creates a Stack from binary string
   * @param binary - The binary string
   * @returns Stack instance
   */
  fromBinary: <A>(binary: string): Stack<A> => {
    const json = Buffer.from(binary, "base64").toString()
    return StackCompanion.fromJSON<A>(json)
  },
}

export const Stack = Companion(StackConstructor, StackCompanion)
