import { List } from "../../src/list/List"
import { Set } from "../../src/set/Set"

describe("List", () => {
  beforeEach(async () => {
    // Nothing
  })

  const list1 = new List<number>()
  const list2 = list1.add(10)
  const list3 = list2.add(20)
  const list4 = list3.removeAt(0)

  it("new list", () => {
    expect(list1).toEqual({ values: [] })
  })

  it("list of 10", () => {
    expect(list2).toEqual({ values: [10] })
  })

  it("list of 10, 20", () => {
    expect(list3).toEqual({ values: [10, 20] })
  })

  it("list of 20", () => {
    expect(list4).toEqual({ values: [20] })
  })

  const list = new List([1, 2, 3, 4])

  const squared = list.map((x) => x * x)
  it("squared", () => {
    expect(squared).toEqual({ values: [1, 4, 9, 16] })
  })

  const flatMapped = list.flatMap((x) => new List([x, x * 10]))
  it("flatMapped", () => {
    expect(flatMapped).toEqual({ values: [1, 10, 2, 20, 3, 30, 4, 40] })
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
