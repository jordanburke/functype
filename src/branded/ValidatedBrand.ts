import { Either, Left, Right } from "@/either"
import { Option } from "@/option"

import { Brand } from "./Brand"

/**
 * A brand with runtime validation
 */
export type ValidatedBrand<K extends string, T> = {
  readonly brand: K
  readonly validate: (value: T) => boolean
  readonly of: (value: T) => Option<Brand<K, T>>
  readonly from: (value: T) => Either<string, Brand<K, T>>
  readonly unsafeOf: (value: T) => Brand<K, T>
  readonly is: (value: unknown) => value is Brand<K, T>
  readonly refine: <K2 extends string>(
    brand: K2,
    validate: (value: Brand<K, T>) => boolean,
  ) => ValidatedBrand<K2, Brand<K, T>>
}

/**
 * Create a validated brand with runtime validation
 */
export function ValidatedBrand<K extends string, T>(brand: K, validate: (value: T) => boolean): ValidatedBrand<K, T> {
  return {
    brand,
    validate,

    of: (value: T): Option<Brand<K, T>> => (validate(value) ? Option(Brand(brand, value)) : Option.none()),

    from: (value: T): Either<string, Brand<K, T>> =>
      validate(value) ? Right(Brand(brand, value)) : Left(`Invalid ${brand}: validation failed`),

    unsafeOf: (value: T): Brand<K, T> => {
      if (!validate(value)) {
        throw new Error(`Invalid ${brand}: validation failed`)
      }
      return Brand(brand, value)
    },

    is: (value: unknown): value is Brand<K, T> => {
      try {
        return validate(value as T)
      } catch {
        return false
      }
    },

    refine: <K2 extends string>(
      newBrand: K2,
      refineValidate: (value: Brand<K, T>) => boolean,
    ): ValidatedBrand<K2, Brand<K, T>> =>
      ValidatedBrand(newBrand, (value: Brand<K, T>) => validate(value as T) && refineValidate(value)),
  }
}

// Common validated brands
export const PositiveNumber = ValidatedBrand("PositiveNumber", (n: number) => n > 0)
export const NonNegativeNumber = ValidatedBrand("NonNegativeNumber", (n: number) => n >= 0)
export const IntegerNumber = ValidatedBrand("IntegerNumber", (n: number) => Number.isInteger(n))
export const PositiveInteger = PositiveNumber.refine("PositiveInteger", (n) => Number.isInteger(n as number))

export const NonEmptyString = ValidatedBrand("NonEmptyString", (s: string) => s.length > 0)
export const EmailAddress = ValidatedBrand("EmailAddress", (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))
export const UrlString = ValidatedBrand("UrlString", (s: string) => {
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
})

// UUID validation
export const UUID = ValidatedBrand("UUID", (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
)

// Date/Time brands
export const ISO8601Date = ValidatedBrand(
  "ISO8601Date",
  (s: string) => !isNaN(Date.parse(s)) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s),
)

// Bounded numbers
export function BoundedNumber(brand: string, min: number, max: number): ValidatedBrand<string, number> {
  return ValidatedBrand(brand, (n: number) => n >= min && n <= max)
}

// String with length constraints
export function BoundedString(brand: string, minLength: number, maxLength: number): ValidatedBrand<string, string> {
  return ValidatedBrand(brand, (s: string) => s.length >= minLength && s.length <= maxLength)
}

// Regex-based string validation
export function PatternString(brand: string, pattern: RegExp): ValidatedBrand<string, string> {
  return ValidatedBrand(brand, (s: string) => pattern.test(s))
}
