import { _Set_ } from "../set"
import { _List_ } from "../list"

export type Converters<A> = {
  toList(): _List_<A>
  toSet(): _Set_<A>
  toString(): string
}

export type Collection<A> = Converters<A>
