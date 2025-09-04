import { describe, it, expect } from "vitest"
import { Validation, type ValidationRule } from "@/error/typed/Validation"

describe("Validation", () => {
  describe("email validation", () => {
    const emailValidator = Validation.rule<string>("email")

    it("should accept valid email addresses", () => {
      const validEmails = [
        "user@example.com",
        "test.user@example.com",
        "user+tag@example.co.uk",
        "123@example.com",
        "a@b.c",
      ]

      for (const email of validEmails) {
        const result = emailValidator(email)
        expect(result.isRight()).toBe(true)
        expect(result.getOrThrow()).toBe(email)
      }
    })

    it("should reject invalid email addresses", () => {
      const invalidEmails = [
        "not-an-email",
        "@example.com",
        "user@",
        "user@@example.com",
        "user example@test.com",
        "",
        null,
        undefined,
        123,
      ]

      for (const email of invalidEmails) {
        const result = emailValidator(email)
        expect(result.isLeft()).toBe(true)
        if (result.isLeft()) {
          const error = result.fold(
            (e) => e,
            () => {
              throw new Error("Should not be right")
            },
          )
          expect(error.code).toBe("VALIDATION_FAILED")
          expect(error.context.rule).toBe("must be a valid email")
        }
      }
    })
  })

  describe("url validation", () => {
    const urlValidator = Validation.rule<string>("url")

    it("should accept valid URLs", () => {
      const validUrls = [
        "https://example.com",
        "http://example.com",
        "https://example.com/path",
        "https://example.com:8080",
        "ftp://files.example.com",
        "https://example.com/path?query=value&other=123",
      ]

      for (const url of validUrls) {
        const result = urlValidator(url)
        expect(result.isRight()).toBe(true)
        expect(result.getOrThrow()).toBe(url)
      }
    })

    it("should reject invalid URLs", () => {
      const invalidUrls = ["not a url", "example.com", "//example.com", "https://", "", null, undefined]

      for (const url of invalidUrls) {
        const result = urlValidator(url)
        expect(result.isLeft()).toBe(true)
      }
    })
  })

  describe("uuid validation", () => {
    const uuidValidator = Validation.rule<string>("uuid")

    it("should accept valid UUIDs", () => {
      const validUuids = [
        "550e8400-e29b-41d4-a716-446655440000",
        "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
        "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
        "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
      ]

      for (const uuid of validUuids) {
        const result = uuidValidator(uuid)
        expect(result.isRight()).toBe(true)
        expect(result.getOrThrow()).toBe(uuid)
      }
    })

    it("should reject invalid UUIDs", () => {
      const invalidUuids = [
        "not-a-uuid",
        "550e8400-e29b-41d4-a716",
        "550e8400-e29b-41d4-a716-446655440000-extra",
        "550e8400-e29b-61d4-a716-446655440000", // Wrong version (6)
        "550e8400-e29b-41d4-z716-446655440000", // Invalid character
        "",
        null,
        undefined,
      ]

      for (const uuid of invalidUuids) {
        const result = uuidValidator(uuid)
        expect(result.isLeft()).toBe(true)
      }
    })
  })

  describe("numeric validations", () => {
    it("should validate numeric values", () => {
      const numericValidator = Validation.rule<number>("numeric")

      expect(numericValidator(123).isRight()).toBe(true)
      expect(numericValidator("123").isRight()).toBe(true)
      expect(numericValidator("456").getOrThrow()).toBe("456")

      expect(numericValidator("abc").isLeft()).toBe(true)
      expect(numericValidator("12.3").isLeft()).toBe(true)
      expect(numericValidator("").isLeft()).toBe(true)
    })

    it("should validate min values", () => {
      const minValidator = Validation.rule<number>("min:18")

      expect(minValidator(18).isRight()).toBe(true)
      expect(minValidator(19).isRight()).toBe(true)
      expect(minValidator(100).isRight()).toBe(true)

      expect(minValidator(17).isLeft()).toBe(true)
      expect(minValidator(0).isLeft()).toBe(true)
      expect(minValidator(-5).isLeft()).toBe(true)
    })

    it("should validate max values", () => {
      const maxValidator = Validation.rule<number>("max:100")

      expect(maxValidator(100).isRight()).toBe(true)
      expect(maxValidator(99).isRight()).toBe(true)
      expect(maxValidator(0).isRight()).toBe(true)
      expect(maxValidator(-10).isRight()).toBe(true)

      expect(maxValidator(101).isLeft()).toBe(true)
      expect(maxValidator(200).isLeft()).toBe(true)
    })
  })

  describe("string validations", () => {
    it("should validate required fields", () => {
      const requiredValidator = Validation.rule<string>("required")

      expect(requiredValidator("value").isRight()).toBe(true)
      expect(requiredValidator("0").isRight()).toBe(true)
      expect(requiredValidator(0).isRight()).toBe(true)
      expect(requiredValidator(false).isRight()).toBe(true)

      expect(requiredValidator("").isLeft()).toBe(true)
      expect(requiredValidator(null).isLeft()).toBe(true)
      expect(requiredValidator(undefined).isLeft()).toBe(true)
    })

    it("should validate alpha strings", () => {
      const alphaValidator = Validation.rule<string>("alpha")

      expect(alphaValidator("abc").isRight()).toBe(true)
      expect(alphaValidator("ABC").isRight()).toBe(true)
      expect(alphaValidator("AbCdEf").isRight()).toBe(true)

      expect(alphaValidator("abc123").isLeft()).toBe(true)
      expect(alphaValidator("abc ").isLeft()).toBe(true)
      expect(alphaValidator("").isLeft()).toBe(true)
      expect(alphaValidator(123).isLeft()).toBe(true)
    })

    it("should validate alphanumeric strings", () => {
      const alphanumericValidator = Validation.rule<string>("alphanumeric")

      expect(alphanumericValidator("abc123").isRight()).toBe(true)
      expect(alphanumericValidator("ABC").isRight()).toBe(true)
      expect(alphanumericValidator("123").isRight()).toBe(true)

      expect(alphanumericValidator("abc-123").isLeft()).toBe(true)
      expect(alphanumericValidator("abc 123").isLeft()).toBe(true)
      expect(alphanumericValidator("").isLeft()).toBe(true)
    })

    it("should validate string length", () => {
      const minLengthValidator = Validation.rule<string>("minLength:5")
      const maxLengthValidator = Validation.rule<string>("maxLength:10")

      expect(minLengthValidator("hello").isRight()).toBe(true)
      expect(minLengthValidator("hello world").isRight()).toBe(true)
      expect(minLengthValidator("hi").isLeft()).toBe(true)
      expect(minLengthValidator("").isLeft()).toBe(true)

      expect(maxLengthValidator("hello").isRight()).toBe(true)
      expect(maxLengthValidator("1234567890").isRight()).toBe(true)
      expect(maxLengthValidator("12345678901").isLeft()).toBe(true)
    })

    it("should validate patterns", () => {
      const phoneValidator = Validation.rule<string>("pattern:^\\d{3}-\\d{3}-\\d{4}$")

      expect(phoneValidator("123-456-7890").isRight()).toBe(true)
      expect(phoneValidator("111-222-3333").isRight()).toBe(true)

      expect(phoneValidator("1234567890").isLeft()).toBe(true)
      expect(phoneValidator("123-456-789").isLeft()).toBe(true)
      expect(phoneValidator("abc-def-ghij").isLeft()).toBe(true)
    })

    it("should validate inclusion lists", () => {
      const inValidator = Validation.rule<string>("in:small,medium,large")

      expect(inValidator("small").isRight()).toBe(true)
      expect(inValidator("medium").isRight()).toBe(true)
      expect(inValidator("large").isRight()).toBe(true)

      expect(inValidator("xl").isLeft()).toBe(true)
      expect(inValidator("tiny").isLeft()).toBe(true)
      expect(inValidator("").isLeft()).toBe(true)
    })

    it("should validate exclusion lists", () => {
      const notInValidator = Validation.rule<string>("notIn:admin,root,superuser")

      expect(notInValidator("user").isRight()).toBe(true)
      expect(notInValidator("guest").isRight()).toBe(true)
      expect(notInValidator("moderator").isRight()).toBe(true)

      expect(notInValidator("admin").isLeft()).toBe(true)
      expect(notInValidator("root").isLeft()).toBe(true)
      expect(notInValidator("superuser").isLeft()).toBe(true)
    })
  })

  describe("date validations", () => {
    it("should validate date strings", () => {
      const dateValidator = Validation.rule<string>("date")

      expect(dateValidator("2023-01-01").isRight()).toBe(true)
      expect(dateValidator("01/01/2023").isRight()).toBe(true)
      expect(dateValidator("Jan 1, 2023").isRight()).toBe(true)
      expect(dateValidator(new Date().toISOString()).isRight()).toBe(true)

      expect(dateValidator("not a date").isLeft()).toBe(true)
      expect(dateValidator("2023-13-01").isLeft()).toBe(true)
      expect(dateValidator("").isLeft()).toBe(true)
    })

    it("should validate future dates", () => {
      const futureValidator = Validation.rule<string>("future")
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      expect(futureValidator(tomorrow.toISOString()).isRight()).toBe(true)

      expect(futureValidator(yesterday.toISOString()).isLeft()).toBe(true)
      expect(futureValidator(new Date().toISOString()).isLeft()).toBe(true)
    })

    it("should validate past dates", () => {
      const pastValidator = Validation.rule<string>("past")
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      expect(pastValidator(yesterday.toISOString()).isRight()).toBe(true)

      expect(pastValidator(tomorrow.toISOString()).isLeft()).toBe(true)
      expect(pastValidator(new Date().toISOString()).isLeft()).toBe(true)
    })
  })

  describe("combined validators", () => {
    it("should combine multiple validators", () => {
      const emailValidator = Validation.combine(
        Validation.rule<string>("required"),
        Validation.rule<string>("email"),
        Validation.rule<string>("maxLength:50"),
      )

      expect(emailValidator("user@example.com").isRight()).toBe(true)

      expect(emailValidator("").isLeft()).toBe(true) // Fails required
      expect(emailValidator("not-an-email").isLeft()).toBe(true) // Fails email
      expect(emailValidator("very.long.email.address.that.exceeds.fifty.characters@example.com").isLeft()).toBe(true) // Fails maxLength
    })

    it("should stop at first validation failure", () => {
      const validator = Validation.combine(Validation.rule<string>("required"), Validation.rule<string>("email"))

      const result = validator("")
      expect(result.isLeft()).toBe(true)
      if (result.isLeft()) {
        const error = result.fold(
          (e) => e,
          () => {
            throw new Error("Should not be right")
          },
        )
        expect(error.context.rule).toBe("is required") // Should fail on required, not email
      }
    })
  })

  describe("custom validators", () => {
    it("should create custom validators", () => {
      const isEven = Validation.custom<number>(
        (value) => typeof value === "number" && value % 2 === 0,
        "must be an even number",
      )

      expect(isEven(2).isRight()).toBe(true)
      expect(isEven(4).isRight()).toBe(true)
      expect(isEven(100).isRight()).toBe(true)

      expect(isEven(1).isLeft()).toBe(true)
      expect(isEven(3).isLeft()).toBe(true)
      expect(isEven("2").isLeft()).toBe(true)
    })

    it("should compose custom validators", () => {
      const isPositiveEven = Validation.combine(
        Validation.rule<number>("min:0"),
        Validation.custom<number>((value) => typeof value === "number" && value % 2 === 0, "must be an even number"),
      )

      expect(isPositiveEven(2).isRight()).toBe(true)
      expect(isPositiveEven(100).isRight()).toBe(true)

      expect(isPositiveEven(-2).isLeft()).toBe(true) // Fails min:0
      expect(isPositiveEven(3).isLeft()).toBe(true) // Fails even check
    })
  })

  describe("form validation", () => {
    it("should validate complete forms", () => {
      const userSchema = {
        name: Validation.rule<string>("required"),
        email: Validation.rule<string>("email"),
        age: Validation.rule<number>("min:18"),
        role: Validation.rule<string>("in:user,admin,moderator"),
      }

      const validData = {
        name: "John Doe",
        email: "john@example.com",
        age: 25,
        role: "user",
      }

      const result = Validation.form(userSchema, validData)
      expect(result.isRight()).toBe(true)
      if (result.isRight()) {
        const data = result.getOrThrow()
        expect(data).toEqual(validData)
      }
    })

    it("should collect all validation errors", () => {
      const schema = {
        name: Validation.rule<string>("required"),
        email: Validation.rule<string>("email"),
        age: Validation.rule<number>("min:18"),
      }

      const invalidData = {
        name: "", // Invalid: required
        email: "not-an-email", // Invalid: email format
        age: 16, // Invalid: too young
      }

      const result = Validation.form(schema, invalidData)
      expect(result.isLeft()).toBe(true)
      if (result.isLeft()) {
        const errors = result.fold(
          (e) => e,
          () => {
            throw new Error("Should not be right")
          },
        )
        expect(errors.length).toBe(3)

        const errorList = errors.toArray()
        expect(errorList[0]!.context.field).toBe("name")
        expect(errorList[1]!.context.field).toBe("email")
        expect(errorList[2]!.context.field).toBe("age")
      }
    })

    it("should handle partial data", () => {
      const schema = {
        name: Validation.rule<string>("required"),
        email: Validation.rule<string>("email"),
        phone: Validation.rule<string>("pattern:^\\d{3}-\\d{3}-\\d{4}$"),
      }

      const partialData = {
        name: "John Doe",
        email: "john@example.com",
        // phone is missing
      }

      const result = Validation.form(schema, partialData)
      expect(result.isLeft()).toBe(true)
      if (result.isLeft()) {
        const errors = result.fold(
          (e) => e,
          () => {
            throw new Error("Should not be right")
          },
        )
        expect(errors.length).toBe(1)
        expect(errors.toArray()[0]!.context.field).toBe("phone")
      }
    })
  })

  describe("pre-built validators", () => {
    it("should provide common validators", () => {
      expect(Validation.validators.email("test@example.com").isRight()).toBe(true)
      expect(Validation.validators.url("https://example.com").isRight()).toBe(true)
      expect(Validation.validators.uuid("550e8400-e29b-41d4-a716-446655440000").isRight()).toBe(true)
      expect(Validation.validators.required("value").isRight()).toBe(true)
      expect(Validation.validators.numeric(123).isRight()).toBe(true)
      expect(Validation.validators.positiveNumber(5).isRight()).toBe(true)
      expect(Validation.validators.nonEmptyString("hello").isRight()).toBe(true)

      expect(Validation.validators.email("not-email").isLeft()).toBe(true)
      expect(Validation.validators.positiveNumber(-5).isLeft()).toBe(true)
      expect(Validation.validators.nonEmptyString("   ").isLeft()).toBe(true)
    })
  })

  describe("type safety with template literals", () => {
    it("should enforce validation rule types at compile time", () => {
      // These are compile-time tests - TypeScript enforces the template literal patterns

      const minRule: ValidationRule = "min:10"
      const emailRule: ValidationRule = "email"
      const patternRule: ValidationRule = "pattern:[A-Z]+"

      // These would fail at compile time:
      // const badRule1: ValidationRule = "invalid:rule"
      // const badRule2: ValidationRule = "min:abc" // min requires number
      // const badRule3: ValidationRule = "unknown"

      expect(minRule).toBeDefined()
      expect(emailRule).toBeDefined()
      expect(patternRule).toBeDefined()
    })
  })
})
