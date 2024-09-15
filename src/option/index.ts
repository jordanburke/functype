import { Type } from "../functor"
import { None, Option, Some } from "./Option"

export const option = <T extends Type>(value?: T): Option<T> => (value ? some(value) : none<T>())
export const some = <T extends Type>(value: T): Option<T> => Some(value)
export const none = <T extends Type>(): Option<T> => None<T>()

export { None, Option, Some }
