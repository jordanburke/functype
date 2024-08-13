import { Try } from "../../src" // Update import path as needed

describe("Try", () => {
  describe("Try.of()", () => {
    it("should wrap a successful operation", () => {
      const myTry = Try.of(() => 1 + 1)
      expect(myTry.isSuccess()).toBe(true)
      expect(myTry.isFailure()).toBe(false)
    })

    it("should wrap a failed operation", () => {
      const myTry = Try.of(() => {
        throw new Error("Something went wrong")
      })
      expect(myTry.isSuccess()).toBe(false)
      expect(myTry.isFailure()).toBe(true)
    })
  })

  describe("getOrElse()", () => {
    it("should return the value on success", () => {
      const myTry = Try.of(() => 1 + 1)
      expect(myTry.getOrElse(0)).toBe(2)
    })

    it("should return the default value on failure", () => {
      const myTry = Try.of<number>(() => {
        throw new Error("Something went wrong")
      })
      expect(myTry.getOrElse(0)).toBe(0)
    })
  })

  describe("orElse()", () => {
    it("should return itself if successful", () => {
      const myTry = Try.of(() => 1 + 1)
      const alternative = Try.of(() => 2 + 2)
      expect(myTry.orElse(alternative).getOrElse(0)).toBe(2)
    })

    it("should return the alternative if failed", () => {
      const myTry = Try.of<number>(() => {
        throw new Error("Something went wrong")
      })
      const alternative = Try.of(() => 2 + 2)
      expect(myTry.orElse(alternative).getOrElse(0)).toBe(4)
    })
  })

  describe("toEither()", () => {
    it("should convert to Right on success", () => {
      const myTry = Try.of(() => 1 + 1)
      const either = myTry.toEither()
      expect(either.isRight()).toBe(true)
    })

    it("should convert to Left on failure", () => {
      const myTry = Try.of(() => {
        throw new Error("Something went wrong")
      })
      const either = myTry.toEither()
      expect(either.isLeft()).toBe(true)
    })
  })
})
