import { isTypeable, List, None, Option, Typeable } from "../../src"

type Shape = Typeable<"circle" | "square"> & {
  kind: string
  value: number
}

describe("List", () => {
  beforeEach(async () => {
    // Setup if needed
  })

  const list1 = List<number>()
  const list2 = list1.add(10)
  const list3 = list2.add(20)
  const list4 = list3.removeAt(0)

  it("new list", () => {
    expect(list1.toValue()).toEqual({ _tag: "List", value: [] })
  })

  it("list of 10", () => {
    expect(list2.toValue()).toEqual({ _tag: "List", value: [10] })
  })

  it("list of 10, 20", () => {
    expect(list3.toValue()).toEqual({ _tag: "List", value: [10, 20] })
  })

  it("list of 20", () => {
    expect(list4.toValue()).toEqual({ _tag: "List", value: [20] })
  })

  const list = List([1, 2, 3, 4])

  const squared = list.map((x) => x * x)
  it("squared", () => {
    expect(squared.toValue()).toEqual({ _tag: "List", value: [1, 4, 9, 16] })
  })

  const flatMapped = list.flatMap((x) => List([x, x * 10]))
  it("flatMapped", () => {
    expect(flatMapped.toValue()).toEqual({ _tag: "List", value: [1, 10, 2, 20, 3, 30, 4, 40] })
  })

  const flatMapAsync = async (x: number) => {
    return List([x, x * 2])
  }

  it("flatMapAsync", async () => {
    const result = await list.flatMapAsync(flatMapAsync)
    expect(result.toValue()).toEqual({ _tag: "List", value: [1, 2, 2, 4, 3, 6, 4, 8] })
  })

  const sum = list.foldLeft(0)((acc, x) => acc + x)
  it("sum", () => {
    expect(sum).toEqual(10)
  })

  const sumRight = list.foldRight(0)((x, acc) => acc + x)
  it("sumRight", () => {
    expect(sumRight).toEqual(10)
  })

  const foldLeftToString = list.foldLeft("hello")((acc, x) => acc + x.toString())
  it("foldLeftToString", () => {
    expect(foldLeftToString).toEqual("hello1234")
  })

  const dropped = list.drop(2)
  it("drop", () => {
    expect(dropped.toValue()).toEqual({ _tag: "List", value: [3, 4] })
  })

  const dropMoreThanSize = list.drop(10)
  it("drop more than size", () => {
    expect(dropMoreThanSize.toValue()).toEqual({ _tag: "List", value: [] })
  })

  const dropRight = list.dropRight(2)
  it("dropRight", () => {
    expect(dropRight.toValue()).toEqual({ _tag: "List", value: [1, 2] })
  })

  const dropRightMoreThanSize = list.dropRight(10)
  it("dropRight more than size", () => {
    expect(dropRightMoreThanSize.toValue()).toEqual({ _tag: "List", value: [] })
  })

  const dropWhile = list.dropWhile((x) => x < 3)
  it("dropWhile", () => {
    expect(dropWhile.toValue()).toEqual({ _tag: "List", value: [3, 4] })
  })

  const flatten = List([[1, 2], [3, 4], 5]).flatten<number>()
  it("flatten", () => {
    expect(flatten.toValue()).toEqual(List([1, 2, 3, 4, 5]).toValue())
  })

  const flattenEmpty = List([]).flatten<number>()
  it("flatten empty list", () => {
    expect(flattenEmpty.toValue()).toEqual(List([]).toValue())
  })

  const isEmpty = list1.isEmpty
  it("isEmpty for empty list", () => {
    expect(isEmpty).toBe(true)
  })

  const isNotEmpty = list3.isEmpty
  it("isEmpty for non-empty list", () => {
    expect(isNotEmpty).toBe(false)
  })

  const headOption = list.headOption
  it("headOption for non-empty list", () => {
    expect(headOption.toValue()).toEqual(Option(1).toValue())
  })

  const headOptionEmpty = list1.headOption
  it("headOption for empty list", () => {
    expect(headOptionEmpty).toEqual(None())
  })

  it("flatMapAsync with empty list", async () => {
    const emptyList = List<number>()
    const result = await emptyList.flatMapAsync(flatMapAsync)
    expect(result.toValue()).toEqual({ _tag: "List", value: [] })
  })

  it("flatMapAsync with delayed function", async () => {
    const delayedAsyncFunction = async (x: number) => {
      return new Promise<List<number>>((resolve) => setTimeout(() => resolve(List([x, x * 3])), 100))
    }

    const result = await list.flatMapAsync(delayedAsyncFunction)
    expect(result.toValue()).toEqual({ _tag: "List", value: [1, 3, 2, 6, 3, 9, 4, 12] })
  })

  // Type guard tests
  // Type guard tests
  describe("Type Guards", () => {
    type Circle = Typeable<"circle", { kind: string; value: number }>
    type Square = Typeable<"square", { kind: string; value: number }>
    type Shape = Circle | Square

    const shapes: List<Shape | undefined> = List([
      Typeable("circle", { kind: "circle", value: 5 }),
      undefined,
      Typeable("square", { kind: "square", value: 4 }),
      Typeable("circle", { kind: "circle", value: 3 }),
    ])

    it("filterType narrows type", () => {
      const circles = shapes.filterType<Circle>("circle")
      expect(circles.toValue()).toEqual({
        _tag: "List",
        value: [
          { _tag: "circle", kind: "circle", value: 5 },
          { _tag: "circle", kind: "circle", value: 3 },
        ],
      })
    })

    it("filter with regular predicate", () => {
      const circles = shapes.filter((shape) => shape !== undefined && isTypeable<Circle>(shape, "circle"))
      expect(circles.toValue()).toEqual({
        _tag: "List",
        value: [
          { _tag: "circle", kind: "circle", value: 5 },
          { _tag: "circle", kind: "circle", value: 3 },
        ],
      })
    })

    it("find with predicate only", () => {
      const firstCircle = shapes.find((shape) => shape !== undefined && shape.value > 4)
      expect(firstCircle.toValue()).toEqual({
        _tag: "Some",
        value: { _tag: "circle", kind: "circle", value: 5 },
      })
    })

    it("find with predicate and type tag", () => {
      const firstCircle = shapes.find<Circle>((shape) => shape !== undefined && shape.value > 4, "circle")
      expect(firstCircle.toValue()).toEqual({
        _tag: "Some",
        value: { _tag: "circle", kind: "circle", value: 5 },
      })
    })

    it("combining filterType and predicate", () => {
      const largeCircles = shapes.filterType<Circle>("circle").filter((circle) => circle.value > 4)

      expect(largeCircles.toValue()).toEqual({
        _tag: "List",
        value: [{ _tag: "circle", kind: "circle", value: 5 }],
      })
    })

    it("handles empty list", () => {
      const emptyList = List<Shape | undefined>()
      expect(emptyList.filterType<Circle>("circle").toValue()).toEqual({ _tag: "List", value: [] })
      expect(emptyList.find((shape) => true, "circle")).toEqual(None())
    })

    it("type narrowing preserves through operations", () => {
      const circles = shapes.filterType<Circle>("circle")
      const circleValues = circles.map((circle) => circle.value)
      expect(circleValues.toValue()).toEqual({
        _tag: "List",
        value: [5, 3],
      })
    })
  })
})
