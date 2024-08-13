import { Tuple } from "../../src/tuple"

describe("Tuple", () => {
  test("map should apply function to the tuple and return new Tuple", () => {
    const tuple = new Tuple([1, 2, 3])
    const mapped = tuple.map((values) => values.map((x) => x * 2))
    expect((mapped as any).toArray()).toEqual([2, 4, 6])
  })

  test("flatMap should apply function to the tuple and return new Tuple", () => {
    const tuple = new Tuple([1, "two", 3])
    const flatMapped = tuple.flatMap(
      (values) =>
        new Tuple(
          values.map((x) => {
            if (typeof x === "number") {
              return x * 2
            } else {
              return x + x
            }
          }),
        ),
    )
    expect(flatMapped.toArray()).toEqual([2, "twotwo", 6])
  })

  test("get should return the value at the specified index", () => {
    const tuple = new Tuple([1, "two", true])
    expect(tuple.get(0)).toBe(1)
    expect(tuple.get(1)).toBe("two")
    expect(tuple.get(2)).toBe(true)
  })

  test("toArray should return the internal array", () => {
    const tuple = new Tuple([1, "two", true])
    expect(tuple.toArray()).toEqual([1, "two", true])
  })
})
