import { Type } from "../functor"
import { List, _List_ } from "./List"

const list = <T extends Type>(items: T[] | undefined) => new List<T>(items)

export { list, List, _List_ }
