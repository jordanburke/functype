import { Type } from "../functor"
import { List } from "./List"

const list = <T extends Type>(items: T[] | undefined) => List<T>(items)

export { list, List }
