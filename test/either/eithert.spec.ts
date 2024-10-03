// Helper function to simulate delay
import { Either, isLeft, isRight, Left, Right, tryCatchAsync } from "../../src"
import { EitherT } from "../../src/either/EitherT"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe("EitherT", () => {
  test("constructs with a Promise<Either<L, R>>", async () => {
    const eitherPromise = Promise.resolve(Right<string, number>(42))
    const eitherT = EitherT(eitherPromise)

    const result = await eitherT.value
    expect(isRight(result)).toBe(true)
    if (isRight(result)) {
      expect(result.value).toBe(42)
    }
  })

  test("map transforms the Right value", async () => {
    const eitherT = EitherT(Promise.resolve(Right<string, number>(10)))
    const mappedEitherT = eitherT.map((value) => value * 2)

    const result = await mappedEitherT.value
    expect(isRight(result)).toBe(true)
    if (isRight(result)) {
      expect(result.value).toBe(20)
    }
  })

  test("map does not transform the Left value", async () => {
    const eitherT = EitherT(Promise.resolve(Left<string, number>("Error")))
    const mappedEitherT = eitherT.map((value) => value * 2)

    const result = await mappedEitherT.value
    expect(isLeft(result)).toBe(true)
    if (isLeft(result)) {
      expect(result.value).toBe("Error")
    }
  })

  test("flatMap chains operations on the Right value", async () => {
    const eitherT = EitherT(Promise.resolve(Right<string, number>(5)))
    const flatMappedEitherT = eitherT.flatMap((value) => EitherT(Promise.resolve(Right<string, number>(value + 3))))

    const result = await flatMappedEitherT.value
    expect(isRight(result)).toBe(true)
    if (isRight(result)) {
      expect(result.value).toBe(8)
    }
  })

  test("flatMap propagates the Left value", async () => {
    const eitherT = EitherT(Promise.resolve(Left<string, number>("Error")))
    const flatMappedEitherT = eitherT.flatMap((value) => EitherT(Promise.resolve(Right<string, number>(value + 3))))

    const result = await flatMappedEitherT.value
    expect(isLeft(result)).toBe(true)
    if (isLeft(result)) {
      expect(result.value).toBe("Error")
    }
  })

  test("mapLeft transforms the Left value", async () => {
    const eitherT = EitherT(Promise.resolve(Left<string, number>("Original Error")))
    const mappedLeftEitherT = eitherT.mapLeft((error) => `Mapped ${error}`)

    const result = await mappedLeftEitherT.value
    expect(isLeft(result)).toBe(true)
    if (isLeft(result)) {
      expect(result.value).toBe("Mapped Original Error")
    }
  })

  test("mapLeft does not affect the Right value", async () => {
    const eitherT = EitherT(Promise.resolve(Right<string, number>(15)))
    const mappedLeftEitherT = eitherT.mapLeft((error) => `Mapped ${error}`)

    const result = await mappedLeftEitherT.value
    expect(isRight(result)).toBe(true)
    if (isRight(result)) {
      expect(result.value).toBe(15)
    }
  })

  test("handles asynchronous operations that resolve", async () => {
    const asyncOperation = async (): Promise<number> => {
      await delay(50)
      return 7
    }

    const eitherT = EitherT(
      tryCatchAsync(
        () => asyncOperation(),
        (error) => (error as Error).message,
      ),
    )

    const result = await eitherT.value
    expect(isRight(result)).toBe(true)
    if (isRight(result)) {
      expect(result.value).toBe(7)
    }
  })

  test("handles asynchronous operations that reject", async () => {
    const asyncOperation = async (): Promise<number> => {
      await delay(50)
      throw new Error("Async Error Occurred")
    }

    const eitherT = EitherT(
      tryCatchAsync(
        () => asyncOperation(),
        (error) => (error as Error).message,
      ),
    )

    const result = await eitherT.value
    expect(isLeft(result)).toBe(true)
    if (isLeft(result)) {
      expect(result.value).toBe("Async Error Occurred")
    }
  })

  test("complex chaining resulting in Right", async () => {
    const eitherT = EitherT(Promise.resolve(Right<string, number>(3)))
      .map((x) => x * 2) // 6
      .flatMap((x) =>
        x > 5
          ? EitherT(Promise.resolve(Right<string, number>(x + 4))) // 10
          : EitherT(Promise.resolve(Left<string, number>("Value too small"))),
      )

    const result = await eitherT.value
    expect(isRight(result)).toBe(true)
    if (isRight(result)) {
      expect(result.value).toBe(10)
    }
  })

  test("complex chaining resulting in Left", async () => {
    const eitherT = EitherT(Promise.resolve(Right<string, number>(2)))
      .map((x) => x * 2) // 4
      .flatMap((x) =>
        x > 5
          ? EitherT(Promise.resolve(Right<string, number>(x + 4)))
          : EitherT(Promise.resolve(Left<string, number>("Value too small"))),
      )
      .mapLeft((error) => `Error: ${error}`)

    const result = await eitherT.value
    expect(isLeft(result)).toBe(true)
    if (isLeft(result)) {
      expect(result.value).toBe("Error: Value too small")
    }
  })

  test("fold handles Right value", async () => {
    const eitherT = EitherT(Promise.resolve(Right<string, number>(25)))

    const foldedResult = await eitherT.fold(
      (error) => `Failure: ${error}`,
      (value) => `Success: ${value}`,
    )

    expect(foldedResult).toBe("Success: 25")
  })

  test("fold handles Left value", async () => {
    const eitherT = EitherT(Promise.resolve(Left<string, number>("Something went wrong")))

    const foldedResult = await eitherT.fold(
      (error) => `Failure: ${error}`,
      (value) => `Success: ${value}`,
    )

    expect(foldedResult).toBe("Failure: Something went wrong")
  })

  test("handles exceptions in map function", async () => {
    const eitherT = EitherT(Promise.resolve(Right<string, number>(10)))

    const mappedEitherT = eitherT.map((value) => {
      throw new Error("Error in map function")
    })

    const result = await mappedEitherT.value.catch((error) => error)

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toBe("Error in map function")
  })

  test("handles exceptions in flatMap function", async () => {
    const eitherT = EitherT(Promise.resolve(Right<string, number>(10)))

    const flatMappedEitherT = eitherT.flatMap((value) => {
      throw new Error("Error in flatMap function")
    })

    const result = await flatMappedEitherT.value.catch((error) => error)

    expect(result).toBeInstanceOf(Error)
    expect((result as Error).message).toBe("Error in flatMap function")
  })
})
