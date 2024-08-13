import { Type } from "../functor"
import { None, _Option_, Some } from "./Option"

export const option = <T extends Type>(value?: T): _Option_<T> => (value ? some(value) : none<T>())
export const some = <T extends Type>(value: T): _Option_<T> => new Some(value)
export const none = <T extends Type>(): _Option_<T> => new None<T>()

export { _Option_, Some, None }
