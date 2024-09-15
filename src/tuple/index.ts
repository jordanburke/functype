import { ArrayType } from "../functor"
import { Tuple } from "./Tuple"

export { Tuple } from "./Tuple"
export const t = <T extends ArrayType>(values: T) => Tuple<T>(values)
export const tuple = <T extends ArrayType>(values: T) => Tuple<T>(values)
