import { describe, expect, it } from "vitest"

import { Left, Right } from "@/either"
import { List } from "@/list/List"
import { Map } from "@/map/Map"
import { None, Some } from "@/option/Option"
import { Set } from "@/set/Set"
import { Try } from "@/try/Try"

describe("Cross data structure pipe tests", () => {
  it("should convert between Option and Either using pipe", () => {
    // Option -> Either
    const some = Some(42)
    const none = None<number>()

    const rightFromSome = some.pipe((value) => Right<string, number>(value))
    const leftFromNone = none.pipe((_) => Left<string, number>("No value"))

    expect(rightFromSome.isRight()).toBe(true)
    expect(rightFromSome.value).toBe(42)
    expect(leftFromNone.isLeft()).toBe(true)
    expect(leftFromNone.value).toBe("No value")

    // Either -> Option
    const right = Right<string, number>(42)
    const left = Left<string, number>("error")

    const someFromRight = right.pipe((value) => {
      if (typeof value === "number") {
        return Some(value)
      }
      return None<number>()
    })

    const noneFromLeft = left.pipe((value) => {
      if (typeof value === "string") {
        return None<number>()
      }
      return Some(value as number)
    })

    expect(someFromRight.isEmpty).toBe(false)
    expect(someFromRight.value).toBe(42)
    expect(noneFromLeft.isEmpty).toBe(true)
  })

  it("should convert between List and Set using pipe", () => {
    // List -> Set
    const list = List([1, 2, 3, 3, 4, 5, 5])
    const setFromList = list.pipe((values) => Set(values))

    expect([...setFromList]).toEqual([1, 2, 3, 4, 5])
    expect(setFromList.size).toBe(5)

    // Set -> List
    const set = Set([1, 2, 3, 4, 5])
    const listFromSet = set.pipe((values) => List(values))

    expect(listFromSet.toArray()).toEqual([1, 2, 3, 4, 5])
    expect(listFromSet.length).toBe(5)
  })

  it("should convert between Set and Map using pipe", () => {
    // Set -> Map
    const userSet = Set([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ])

    const userMapFromSet = userSet.pipe((users: { id: number; name: string }[]) => {
      return Map(users.map((user) => [user.id, user.name] as [number, string]))
    })

    expect(userMapFromSet.get(1).orElse("")).toBe("Alice")
    expect(userMapFromSet.get(2).orElse("")).toBe("Bob")
    expect(userMapFromSet.get(3).orElse("")).toBe("Charlie")

    // Map -> Set
    const scoreMap = Map([
      ["Alice", 95],
      ["Bob", 80],
      ["Charlie", 90],
    ])

    const scoreSetFromMap = scoreMap.pipe((entries) => {
      return Set(entries.map(([name, score]) => ({ name, score })))
    })

    const scoresArray = [...scoreSetFromMap]
    expect(scoresArray).toContainEqual({ name: "Alice", score: 95 })
    expect(scoresArray).toContainEqual({ name: "Bob", score: 80 })
    expect(scoresArray).toContainEqual({ name: "Charlie", score: 90 })
  })

  it("should chain operations across multiple data structures", () => {
    // Start with an Option, convert to List, then to Set, then calculate stats
    const optionValue = Some([10, 20, 30, 40, 50])

    // Step 1: Convert Option to List
    const listValue = optionValue.pipe((arr) => List(arr))

    // Step 2: Add more elements to the list
    const expandedList = listValue.concat(List([60, 70, 80, 90, 100]))

    // Step 3: Convert to Set to work with unique values
    const uniqueValuesSet = Set(expandedList)

    // Step 4: Calculate statistics from set values
    const result = uniqueValuesSet.pipe((uniqueSet: number[]) => {
      const values = [...uniqueSet]
      return {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      }
    })

    expect(result).toEqual({
      count: 10,
      sum: 550,
      average: 55,
      min: 10,
      max: 100,
    })
  })

  it("should combine Option and Try using pipe", () => {
    // Start with Some, convert to Try, then back to Option
    const some = Some(42)

    // Step 1: Convert Option to Try
    const tryValue = some.pipe((value) => Try(() => value * 2))

    // Step 2: Convert Try back to Option
    const result = tryValue.isSuccess() ? Some(tryValue.orThrow()) : None<number>()

    expect(result.isEmpty).toBe(false)
    expect(result.value).toBe(84)

    // Start with None, try to convert and handle
    const none = None<number>()

    // Step 1: Convert None to Try (which will throw)
    const tryFromNone = none.pipe((_) => {
      return Try(() => {
        throw new Error("Cannot operate on None")
      })
    })

    // Step 2: Convert Try back to Option
    const noneResult = tryFromNone.isFailure() ? None<number>() : Some(tryFromNone.orThrow())

    expect(noneResult.isEmpty).toBe(true)
  })

  it("should compose Either and Map using pipe", () => {
    // Define a user database as a Map
    const userMap = Map([
      [1, { name: "Alice", role: "admin" }],
      [2, { name: "Bob", role: "user" }],
      [3, { name: "Charlie", role: "user" }],
    ])

    // Function to lookup user by ID, returning Either<string, User>
    const findUser = (id: number) => {
      return userMap.get(id).fold(
        () => Left<string, { name: string; role: string }>(`User with ID ${id} not found`),
        (user) => Right<string, { name: string; role: string }>(user),
      )
    }

    // Check if user is an admin
    const isAdmin = (user: { name: string; role: string }) => {
      return user.role === "admin"
        ? Right<string, string>(`${user.name} is an admin`)
        : Left<string, string>(`${user.name} is not an admin`)
    }

    // Pipe the whole operation for a valid admin user
    const userResult1 = findUser(1)
    const adminCheckResult = userResult1.pipeEither(
      (error) => Left<string, string>(error),
      (user) => isAdmin(user),
    )

    expect(adminCheckResult.isRight()).toBe(true)
    expect(adminCheckResult.value).toBe("Alice is an admin")

    // Pipe the whole operation for a valid non-admin user
    const userResult2 = findUser(2)
    const nonAdminCheckResult = userResult2.pipeEither(
      (error) => Left<string, string>(error),
      (user) => isAdmin(user),
    )

    expect(nonAdminCheckResult.isLeft()).toBe(true)
    expect(nonAdminCheckResult.value).toBe("Bob is not an admin")

    // Pipe the whole operation for a non-existent user
    const userResult4 = findUser(4)
    const notFoundCheckResult = userResult4.pipeEither(
      (error) => Left<string, string>(error),
      (user) => isAdmin(user),
    )

    expect(notFoundCheckResult.isLeft()).toBe(true)
    expect(notFoundCheckResult.value).toBe("User with ID 4 not found")
  })

  it("should transform data through multiple structures", () => {
    // Input data as a List of user objects
    const users = List([
      { id: 1, name: "Alice", score: 95 },
      { id: 2, name: "Bob", score: 80 },
      { id: 3, name: "Charlie", score: 90 },
      { id: 4, name: "David", score: 85 },
      { id: 5, name: "Eve", score: 98 },
    ])

    // Step 1: Convert List to Map keyed by ID
    const userMap = users.pipe((userArray) => Map(userArray.map((user) => [user.id, user])))

    // Step 2: Extract entries from Map, filter high scorers
    const highScorerEntries = userMap.pipe((entries) =>
      entries.filter(([_, user]) => user.score >= 90).map(([_, user]) => user),
    )

    // Step 3: Convert filtered entries to Set
    const highScorersSet = Set(highScorerEntries)

    // Step 4: Find user with highest score from Set
    type User = { id: number; name: string; score: number }

    const highScorersArray = [...highScorersSet] as User[]
    const topScorer = highScorersArray.reduce<User>((max, user) => (user.score > max.score ? user : max), {
      id: 0,
      name: "",
      score: 0,
    })

    // Create Option with the top scorer
    const topScorerOption = topScorer.id !== 0 ? Some<User>(topScorer) : None<User>()

    // Step 5: Format the result
    const result = topScorerOption.fold(
      () => "No top scorer found",
      (user) => `Top scorer: ${user.name} with ${user.score} points`,
    )

    expect(result).toBe("Top scorer: Eve with 98 points")
  })

  it("should handle errors across different data structures", () => {
    // Start with a Map of user IDs to user objects
    const userMap = Map([
      [1, { name: "Alice", age: 30 }],
      [2, { name: "Bob", age: 25 }],
      [3, { name: "Charlie", age: 35 }],
    ])

    // Function that might fail
    const getUserById = (id: number) => {
      return userMap.get(id).fold(
        () => {
          throw new Error(`User with ID ${id} not found`)
        },
        (user) => user,
      )
    }

    // Convert successful result to a List of user properties
    const processResult = (user: { name: string; age: number }) => {
      return List([`Name: ${user.name}`, `Age: ${user.age}`, `Adult: ${user.age >= 18 ? "Yes" : "No"}`])
    }

    // Step 1: Use Try to handle getting a valid user
    const validUserTry = Try(() => getUserById(1))

    // Step 2: Process the result if successful, handle error if not
    let validUserResult: List<string>
    if (validUserTry.isSuccess()) {
      validUserResult = processResult(validUserTry.orThrow())
    } else {
      validUserResult = List<string>([`Error: ${validUserTry.error?.message ?? "Unknown error"}`])
    }

    expect(validUserResult.toArray()).toEqual(["Name: Alice", "Age: 30", "Adult: Yes"])

    // Repeat the process with an invalid user ID
    // Step 1: Use Try to handle getting a valid user (will throw)
    const invalidUserTry = Try(() => getUserById(999))

    // Step 2: Process the result if successful, handle error if not
    let invalidUserResult: List<string>
    if (invalidUserTry.isSuccess()) {
      invalidUserResult = processResult(invalidUserTry.orThrow())
    } else {
      invalidUserResult = List<string>([`Error: ${invalidUserTry.error?.message ?? "Unknown error"}`])
    }

    expect(invalidUserResult.toArray()).toEqual(["Error: User with ID 999 not found"])
  })
})
