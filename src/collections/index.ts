import { List } from "@/list/List"
import { Set } from "@/set/Set"

export type Converters<A> = {
  toList(): List<A>
  toSet(): Set<A>
  toString(): string
}

export type Collection<A> = Converters<A>
