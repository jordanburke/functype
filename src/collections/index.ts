import { Set } from "../set"
import { List } from "../list"

export type Converters<A> = {
  toList(): List<A>
  toSet(): Set<A>
  toString(): string
}

export type Collection<A> = Converters<A>
