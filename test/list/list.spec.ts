import { List } from "../../src"

describe("List", () => {
  beforeEach(async () => {
    // Nothing
  })

  const list1 = List<number>()
  const list2 = list1.add(10)
  const list3 = list2.add(20)
  const list4 = list3.removeAt(0)

  it("new list", () => {
    expect(list1.valueOf()).toEqual({ values: [] })
  })

  it("list of 10", () => {
    expect(list2.valueOf()).toEqual({ values: [10] })
  })

  it("list of 10, 20", () => {
    expect(list3.valueOf()).toEqual({ values: [10, 20] })
  })

  it("list of 20", () => {
    expect(list4.valueOf()).toEqual({ values: [20] })
  })

  const list = List([1, 2, 3, 4])

  const squared = list.map((x) => x * x)
  it("squared", () => {
    expect(squared.valueOf()).toEqual({ values: [1, 4, 9, 16] })
  })

  const flatMapped = list.flatMap((x) => List([x, x * 10]))
  it("flatMapped", () => {
    expect(flatMapped.valueOf()).toEqual({ values: [1, 10, 2, 20, 3, 30, 4, 40] })
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
})
