import type { Type } from "@/types"

import type { Functype } from "./Functype"

/**
 * Example: Custom Box type implementing Functype
 * This demonstrates how to create a new data structure that implements
 * the unified Functype interface.
 */

type BoxTag = "Empty" | "Full"

class Box<T extends Type> implements Functype<T, BoxTag> {
  constructor(
    public readonly _tag: BoxTag,
    private readonly _value?: T,
  ) {}

  // Functor methods
  map<U extends Type>(f: (value: T) => U): Box<U> {
    return this._tag === "Full" && this._value !== undefined ? new Box<U>("Full", f(this._value)) : new Box<U>("Empty")
  }

  // Applicative methods
  ap<U extends Type>(ff: Box<(value: T) => U>): Box<U> {
    if (this._tag === "Full" && ff._tag === "Full" && this._value !== undefined && ff._value) {
      return new Box<U>("Full", ff._value(this._value))
    }
    return new Box<U>("Empty")
  }

  // Monad methods
  flatMap<U extends Type>(f: (value: T) => Box<U>): Box<U> {
    return this._tag === "Full" && this._value !== undefined ? f(this._value) : new Box<U>("Empty")
  }

  // AsyncMonad methods
  async flatMapAsync<U extends Type>(f: (value: T) => Promise<Box<U>>): Promise<Box<U>> {
    return this._tag === "Full" && this._value !== undefined ? await f(this._value) : new Box<U>("Empty")
  }

  // Traversable methods
  size = this._tag === "Full" ? 1 : 0
  isEmpty = this._tag === "Empty"

  contains(value: T): boolean {
    return this._tag === "Full" && this._value === value
  }

  reduce(f: (b: T, a: T) => T): T {
    if (this._tag === "Empty" || this._value === undefined) {
      throw new Error("Cannot reduce an empty Box")
    }
    return this._value
  }

  reduceRight(f: (b: T, a: T) => T): T {
    if (this._tag === "Empty" || this._value === undefined) {
      throw new Error("Cannot reduceRight an empty Box")
    }
    return this._value
  }

  // Extractable methods
  get(): T {
    if (this._tag === "Empty" || this._value === undefined) {
      throw new Error("Cannot get value from Empty Box")
    }
    return this._value
  }

  getOrElse(defaultValue: T): T {
    return this._tag === "Full" && this._value !== undefined ? this._value : defaultValue
  }

  getOrThrow(error: Error): T {
    if (this._tag === "Empty" || this._value === undefined) {
      throw error
    }
    return this._value
  }

  orElse(alternative: Box<T>): Box<T> {
    return this._tag === "Full" ? this : alternative
  }

  orNull(): T | null {
    return this._tag === "Full" && this._value !== undefined ? this._value : null
  }

  orUndefined(): T | undefined {
    return this._tag === "Full" ? this._value : undefined
  }

  // Foldable methods
  fold<U>(onEmpty: () => U, onFull: (value: T) => U): U {
    return this._tag === "Full" && this._value !== undefined ? onFull(this._value) : onEmpty()
  }

  foldLeft<B>(z: B): (op: (b: B, a: T) => B) => B {
    return (op) => (this._tag === "Full" && this._value !== undefined ? op(z, this._value) : z)
  }

  foldRight<B>(z: B): (op: (a: T, b: B) => B) => B {
    return (op) => (this._tag === "Full" && this._value !== undefined ? op(this._value, z) : z)
  }

  // Matchable methods
  match<R>(patterns: { Empty: () => R; Full: (value: T) => R }): R {
    return this._tag === "Full" && this._value !== undefined ? patterns.Full(this._value) : patterns.Empty()
  }

  // Serializable methods
  serialize() {
    const data = { _tag: this._tag, value: this._value }
    return {
      toJSON: () => JSON.stringify(data),
      toYAML: () => `_tag: ${this._tag}\nvalue: ${JSON.stringify(this._value)}`,
      toBinary: () => Buffer.from(JSON.stringify(data)).toString("base64"),
    }
  }

  // Pipe methods
  pipe<U>(f: (value: T) => U): U {
    if (this._tag === "Empty" || this._value === undefined) {
      throw new Error("Cannot pipe from Empty Box")
    }
    return f(this._value)
  }

  // Valuable method
  toValue(): { _tag: BoxTag; value: T } {
    return { _tag: this._tag, value: this._value as T }
  }

  // Helper factory methods
  static empty<T extends Type>(): Box<T> {
    return new Box<T>("Empty")
  }

  static of<T extends Type>(value: T): Box<T> {
    return new Box<T>("Full", value)
  }
}

// Usage example
const box1 = Box.of(42)
const box2 = box1.map((x) => x * 2)
const result = box2.match({
  Empty: () => "No value",
  Full: (value) => `Value is ${value}`,
})

console.log(result) // "Value is 84"
