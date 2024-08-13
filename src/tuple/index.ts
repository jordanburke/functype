import { ArrayType } from "../functor"
import { _Tuple_, Tuple } from "./Tuple"

export { Tuple, _Tuple_ } from "./Tuple"
export const t = <T extends ArrayType>(values: T) => new Tuple<T>(values)
export const tuple = <T extends ArrayType>(values: T) => new Tuple<T>(values)