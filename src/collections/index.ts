import { List } from "@/list/List"
import { Set } from "@/set/Set"

/**
 * Defines conversion methods for collection types
 * @interface
 * @module Collections
 * @category Core
 */
export type Converters<A> = {
  toList(): List<A>
  toSet(): Set<A>
  toString(): string
}

/**
 * Represents a collection with conversion capabilities
 * @interface
 * @module Collections
 * @category Core
 */
export type Collection<A> = Converters<A>
