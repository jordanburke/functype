import { describe, expect, it } from "vitest"

import { Map } from "@/map/Map"

describe("Map pipe", () => {
  it("should pipe map entries through function", () => {
    const map = Map([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ])

    const result = map.pipe((entries) => {
      return entries.reduce(
        (acc, [key, value]) => {
          acc[key] = value
          return acc
        },
        {} as Record<string, number>,
      )
    })

    expect(result).toEqual({
      a: 1,
      b: 2,
      c: 3,
    })
  })

  it("should pipe empty map through function", () => {
    const emptyMap = Map<string, number>([])

    const result = emptyMap.pipe((entries) => {
      // entries is an empty array
      return entries.length === 0 ? "empty" : "not empty"
    })

    expect(result).toBe("empty")
  })

  it("should pipe map through complex transformation functions", () => {
    const userMap = Map([
      ["user1", { name: "Alice", age: 30 }],
      ["user2", { name: "Bob", age: 25 }],
      ["user3", { name: "Charlie", age: 35 }],
    ])

    const result = userMap.pipe((entries) => {
      return entries.map(([id, user]) => ({
        id,
        displayName: `${user.name} (${user.age})`,
        isAdult: user.age >= 18,
      }))
    })

    expect(result).toEqual([
      { id: "user1", displayName: "Alice (30)", isAdult: true },
      { id: "user2", displayName: "Bob (25)", isAdult: true },
      { id: "user3", displayName: "Charlie (35)", isAdult: true },
    ])
  })

  it("should preserve map values through piping", () => {
    const map = Map([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ])

    const entriesBeforePipe = map
      .toList()
      .toArray()
      .map((t) => t.toArray())

    // Pipe should not modify original map
    map.pipe((entries) => {
      entries.push(["d", 4])
      return entries
    })

    const entriesAfterPipe = map
      .toList()
      .toArray()
      .map((t) => t.toArray())
    expect(entriesAfterPipe).toEqual(entriesBeforePipe)
  })

  it("should enable map analytics", () => {
    const scoreMap = Map([
      ["Alice", 95],
      ["Bob", 80],
      ["Charlie", 90],
      ["David", 85],
      ["Eve", 98],
    ])

    const result = scoreMap.pipe((entries) => {
      const scores = entries.map(([_, score]) => score)

      return {
        highestScore: Math.max(...scores),
        lowestScore: Math.min(...scores),
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        studentCount: entries.length,
      }
    })

    expect(result).toEqual({
      highestScore: 98,
      lowestScore: 80,
      averageScore: 89.6,
      studentCount: 5,
    })
  })

  it("should work with filtering operations", () => {
    const peopleMap = Map([
      ["p1", { name: "Alice", age: 17 }],
      ["p2", { name: "Bob", age: 25 }],
      ["p3", { name: "Charlie", age: 16 }],
      ["p4", { name: "David", age: 30 }],
      ["p5", { name: "Eve", age: 22 }],
    ])

    const result = peopleMap.pipe((entries) => {
      const adults = entries.filter(([_, person]) => person.age >= 18)
      const minors = entries.filter(([_, person]) => person.age < 18)

      return {
        adultCount: adults.length,
        minorCount: minors.length,
        adultNames: adults.map(([_, person]) => person.name),
        minorNames: minors.map(([_, person]) => person.name),
      }
    })

    expect(result).toEqual({
      adultCount: 3,
      minorCount: 2,
      adultNames: ["Bob", "David", "Eve"],
      minorNames: ["Alice", "Charlie"],
    })
  })
})
