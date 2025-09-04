import type { Either } from "@/either"
import { Left, Right } from "@/either"
import { TypedError } from "@/error/typed/TypedError"
import { List } from "@/list"
import type { Type } from "@/types"

/**
 * Validation rule types using template literal types
 */
export type ValidationRule =
  | `min:${number}`
  | `max:${number}`
  | `minLength:${number}`
  | `maxLength:${number}`
  | `pattern:${string}`
  | `email`
  | `url`
  | `uuid`
  | `required`
  | `numeric`
  | `alpha`
  | `alphanumeric`
  | `date`
  | `future`
  | `past`
  | `in:${string}`
  | `notIn:${string}`

/**
 * Validator function type
 */
export type Validator<T> = (value: unknown) => Either<TypedError<"VALIDATION_FAILED">, T>

/**
 * Field validation result
 */
export type FieldValidation<T> = {
  field: string
  value: unknown
  result: Either<TypedError<"VALIDATION_FAILED">, T>
}

/**
 * Form validation result
 */
export type FormValidation<T extends Record<string, Type>> = Either<List<TypedError<"VALIDATION_FAILED">>, T>

/**
 * Create validators from validation rules
 */
const ValidationConstructor = {
  /**
   * Create a validator from a rule string
   * @example
   * const validator = Validation.rule<number>("min:18")
   * const result = validator(25) // Right(25)
   * const error = validator(15) // Left(TypedError)
   */
  rule: <T extends Type>(rule: ValidationRule): Validator<T> => {
    return (value: unknown): Either<TypedError<"VALIDATION_FAILED">, T> => {
      // Email validation
      if (rule === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof value !== "string" || !emailRegex.test(value)) {
          return Left(TypedError.validation("value", value, "must be a valid email"))
        }
        return Right(value as T)
      }

      // URL validation
      if (rule === "url") {
        try {
          new URL(String(value))
          return Right(value as T)
        } catch {
          return Left(TypedError.validation("value", value, "must be a valid URL"))
        }
      }

      // UUID validation
      if (rule === "uuid") {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (typeof value !== "string" || !uuidRegex.test(value)) {
          return Left(TypedError.validation("value", value, "must be a valid UUID"))
        }
        return Right(value as T)
      }

      // Required validation
      if (rule === "required") {
        if (value === null || value === undefined || value === "") {
          return Left(TypedError.validation("value", value, "is required"))
        }
        return Right(value as T)
      }

      // Numeric validation
      if (rule === "numeric") {
        if (typeof value !== "number" && !/^\d+$/.test(String(value))) {
          return Left(TypedError.validation("value", value, "must be numeric"))
        }
        return Right(value as T)
      }

      // Alpha validation
      if (rule === "alpha") {
        if (typeof value !== "string" || !/^[a-zA-Z]+$/.test(value)) {
          return Left(TypedError.validation("value", value, "must contain only letters"))
        }
        return Right(value as T)
      }

      // Alphanumeric validation
      if (rule === "alphanumeric") {
        if (typeof value !== "string" || !/^[a-zA-Z0-9]+$/.test(value)) {
          return Left(TypedError.validation("value", value, "must be alphanumeric"))
        }
        return Right(value as T)
      }

      // Min validation
      if (rule.startsWith("min:")) {
        const min = Number(rule.split(":")[1])
        const num = Number(value)
        if (isNaN(num) || num < min) {
          return Left(TypedError.validation("value", value, `must be at least ${min}`))
        }
        return Right(value as T)
      }

      // Max validation
      if (rule.startsWith("max:")) {
        const max = Number(rule.split(":")[1])
        const num = Number(value)
        if (isNaN(num) || num > max) {
          return Left(TypedError.validation("value", value, `must be at most ${max}`))
        }
        return Right(value as T)
      }

      // MinLength validation
      if (rule.startsWith("minLength:")) {
        const minLength = Number(rule.split(":")[1])
        const str = String(value)
        if (str.length < minLength) {
          return Left(TypedError.validation("value", value, `must be at least ${minLength} characters`))
        }
        return Right(value as T)
      }

      // MaxLength validation
      if (rule.startsWith("maxLength:")) {
        const maxLength = Number(rule.split(":")[1])
        const str = String(value)
        if (str.length > maxLength) {
          return Left(TypedError.validation("value", value, `must be at most ${maxLength} characters`))
        }
        return Right(value as T)
      }

      // Pattern validation
      if (rule.startsWith("pattern:")) {
        const pattern = rule.substring(8) // Remove "pattern:"
        const regex = new RegExp(pattern)
        if (!regex.test(String(value))) {
          return Left(TypedError.validation("value", value, `must match pattern ${pattern}`))
        }
        return Right(value as T)
      }

      // In validation
      if (rule.startsWith("in:")) {
        const allowed = rule.substring(3).split(",")
        if (!allowed.includes(String(value))) {
          return Left(TypedError.validation("value", value, `must be one of: ${allowed.join(", ")}`))
        }
        return Right(value as T)
      }

      // NotIn validation
      if (rule.startsWith("notIn:")) {
        const disallowed = rule.substring(6).split(",")
        if (disallowed.includes(String(value))) {
          return Left(TypedError.validation("value", value, `must not be one of: ${disallowed.join(", ")}`))
        }
        return Right(value as T)
      }

      // Date validations
      if (rule === "date") {
        const date = new Date(String(value))
        if (isNaN(date.getTime())) {
          return Left(TypedError.validation("value", value, "must be a valid date"))
        }
        return Right(value as T)
      }

      if (rule === "future") {
        const date = new Date(String(value))
        if (isNaN(date.getTime()) || date <= new Date()) {
          return Left(TypedError.validation("value", value, "must be a future date"))
        }
        return Right(value as T)
      }

      if (rule === "past") {
        const date = new Date(String(value))
        if (isNaN(date.getTime()) || date >= new Date()) {
          return Left(TypedError.validation("value", value, "must be a past date"))
        }
        return Right(value as T)
      }

      // Default case
      return Right(value as T)
    }
  },

  /**
   * Combine multiple validators
   * @example
   * const validator = Validation.combine(
   *   Validation.rule<string>("required"),
   *   Validation.rule<string>("email"),
   *   Validation.rule<string>("maxLength:100")
   * )
   */
  combine: <T extends Type>(...validators: Validator<T>[]): Validator<T> => {
    return (value: unknown): Either<TypedError<"VALIDATION_FAILED">, T> => {
      for (const validator of validators) {
        const result = validator(value)
        if (result.isLeft()) {
          return result
        }
      }
      return Right(value as T)
    }
  },

  /**
   * Create a custom validator
   * @example
   * const isEven = Validation.custom<number>(
   *   (value) => typeof value === "number" && value % 2 === 0,
   *   "must be an even number"
   * )
   */
  custom: <T extends Type>(predicate: (value: unknown) => boolean, errorMessage: string): Validator<T> => {
    return (value: unknown): Either<TypedError<"VALIDATION_FAILED">, T> => {
      if (!predicate(value)) {
        return Left(TypedError.validation("value", value, errorMessage))
      }
      return Right(value as T)
    }
  },

  /**
   * Validate a form with multiple fields
   * @example
   * const schema = {
   *   name: Validation.rule<string>("required"),
   *   email: Validation.rule<string>("email"),
   *   age: Validation.rule<number>("min:18")
   * }
   * const result = Validation.form(schema, { name: "John", email: "john@example.com", age: 25 })
   */
  form: <T extends Record<string, Type>>(
    schema: { [K in keyof T]: Validator<T[K]> },
    data: Record<string, unknown>,
  ): FormValidation<T> => {
    const errors: TypedError<"VALIDATION_FAILED">[] = []
    const validated: Partial<T> = {}

    for (const [field, validator] of Object.entries(schema)) {
      const value = data[field]
      const result = validator(value)

      if (result.isLeft()) {
        const error = result.fold(
          (e: TypedError<"VALIDATION_FAILED">) => e,
          () => {
            throw new Error("Should not be left")
          },
        )
        // Update the error context with the field name
        const fieldError = TypedError.validation(field, value, error.context.rule)
        errors.push(fieldError)
      } else {
        validated[field as keyof T] = result.getOrThrow()
      }
    }

    if (errors.length > 0) {
      return Left(List(errors))
    }

    return Right(validated as T)
  },
}

const ValidationCompanion = {
  ...ValidationConstructor,

  /**
   * Common pre-built validators
   */
  validators: {
    email: ValidationConstructor.rule<string>("email"),
    url: ValidationConstructor.rule<string>("url"),
    uuid: ValidationConstructor.rule<string>("uuid"),
    required: ValidationConstructor.rule<string>("required"),
    numeric: ValidationConstructor.rule<number>("numeric"),
    positiveNumber: ValidationConstructor.combine(
      ValidationConstructor.rule<number>("numeric"),
      ValidationConstructor.rule<number>("min:0"),
    ),
    nonEmptyString: ValidationConstructor.combine(
      ValidationConstructor.rule<string>("required"),
      ValidationConstructor.custom<string>(
        (value) => typeof value === "string" && value.trim().length > 0,
        "must not be empty",
      ),
    ),
  },
}

export const Validation = Object.assign(ValidationConstructor.rule, ValidationCompanion)
