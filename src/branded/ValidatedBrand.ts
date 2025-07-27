import { Either, Left, Right } from "@/either"
import { Option } from "@/option"

import { Brand } from "./Brand"

/**
 * A brand with runtime validation
 * @example
 * const Age = ValidatedBrand("Age", (n: number) => n >= 0 && n <= 150)
 * const myAge = Age.of(25) // Option<Brand<"Age", number>>
 * const invalid = Age.of(-5) // None
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
 * @example
 * const Email = ValidatedBrand("Email", (s: string) => /^[^@]+@[^@]+\.[^@]+$/.test(s))
 * const email = Email.of("user@example.com") // Some(Brand<"Email", string>)
 *
 * @example
 * // With Either for error messages
 * const Port = ValidatedBrand("Port", (n: number) => n >= 1 && n <= 65535)
 * const result = Port.from(8080) // Right(Brand<"Port", number>)
 * const error = Port.from(70000) // Left("Invalid Port: validation failed")
 *
 * @example
 * // Type guard usage
 * const value: unknown = "test@example.com"
 * if (Email.is(value)) {
 *   // value is Brand<"Email", string>
 * }
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
      ValidatedBrand(newBrand, (value: Brand<K, T>) => validate(value.unbrand()) && refineValidate(value)),
  }
}

/**
 * Positive number brand (> 0)
 * @example
 * const price = PositiveNumber.of(19.99) // Some(Brand<"PositiveNumber", number>)
 * const invalid = PositiveNumber.of(-5) // None
 * const checked = PositiveNumber.from(0) // Left("Invalid PositiveNumber: validation failed")
 */
export const PositiveNumber = ValidatedBrand("PositiveNumber", (n: number) => n > 0)
export const NonNegativeNumber = ValidatedBrand("NonNegativeNumber", (n: number) => n >= 0)
export const IntegerNumber = ValidatedBrand("IntegerNumber", (n: number) => Number.isInteger(n))
export const PositiveInteger = PositiveNumber.refine("PositiveInteger", (n) => Number.isInteger(n as number))

/**
 * Non-empty string brand
 * @example
 * const name = NonEmptyString.of("John") // Some(Brand<"NonEmptyString", string>)
 * const empty = NonEmptyString.of("") // None
 */
export const NonEmptyString = ValidatedBrand("NonEmptyString", (s: string) => s.length > 0)
/**
 * Email address brand with basic validation
 * @example
 * const email = EmailAddress.of("user@example.com") // Some(Brand<"EmailAddress", string>)
 * const invalid = EmailAddress.of("not-an-email") // None
 *
 * @example
 * // Using with forms
 * const processEmail = (input: string) => {
 *   return EmailAddress.from(input)
 *     .map(email => sendWelcomeEmail(email))
 *     .getOrElse("Invalid email address")
 * }
 */
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

/**
 * Create a number brand with min/max bounds
 * @example
 * const Percentage = BoundedNumber("Percentage", 0, 100)
 * const valid = Percentage.of(75) // Some(Brand<"Percentage", number>)
 * const invalid = Percentage.of(150) // None
 *
 * @example
 * const Port = BoundedNumber("Port", 1, 65535)
 * const httpPort = Port.unsafeOf(80) // Brand<"Port", number>
 * // Port.unsafeOf(70000) // throws Error
 */
export function BoundedNumber(brand: string, min: number, max: number): ValidatedBrand<string, number> {
  return ValidatedBrand(brand, (n: number) => n >= min && n <= max)
}

/**
 * Create a string brand with length constraints
 * @example
 * const Username = BoundedString("Username", 3, 20)
 * const valid = Username.of("johndoe") // Some(Brand<"Username", string>)
 * const tooShort = Username.of("jo") // None
 * const tooLong = Username.of("verylongusernamethatexceedslimit") // None
 */
export function BoundedString(brand: string, minLength: number, maxLength: number): ValidatedBrand<string, string> {
  return ValidatedBrand(brand, (s: string) => s.length >= minLength && s.length <= maxLength)
}

/**
 * Create a string brand that matches a regex pattern
 * @example
 * const HexColor = PatternString("HexColor", /^#[0-9a-f]{6}$/i)
 * const red = HexColor.of("#ff0000") // Some(Brand<"HexColor", string>)
 * const invalid = HexColor.of("red") // None
 *
 * @example
 * const PhoneNumber = PatternString("PhoneNumber", /^\+?[1-9]\d{1,14}$/)
 * const phone = PhoneNumber.from("+1234567890")
 *   .map(p => formatPhoneNumber(p))
 *   .getOrElse("Invalid phone number")
 */
export function PatternString(brand: string, pattern: RegExp): ValidatedBrand<string, string> {
  return ValidatedBrand(brand, (s: string) => pattern.test(s))
}
