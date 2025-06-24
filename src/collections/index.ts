import { List } from "@/list/List"
import { Set } from "@/set/Set"

/**
 * Defines conversion methods for collection types
 * @interface
 * @module Collections
 * @category Core
 */
export interface Converters<A> {
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
// Using type alias here since Collection is just an alias for Converters
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Collection<A> extends Converters<A> {}
