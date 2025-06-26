import { List } from "@/list/List"
import { Set } from "@/set/Set"

/**
 * Represents a collection with conversion capabilities
 * @interface
 * @module Collections
 * @category Core
 */
export interface Collection<A> {
  toList(): List<A>
  toSet(): Set<A>
  toString(): string
}
