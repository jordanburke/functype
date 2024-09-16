import { List } from "../list"
import { Set } from "../set"

export type Converters<A> = {
  toList(): List<A>
  toSet(): Set<A>
  toString(): string
}

export type Collection<A> = Converters<A>
