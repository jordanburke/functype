import { describe, expect, it } from "vitest"

import { Either } from "@/either/Either"
import { Option } from "@/option/Option"
import { Try } from "@/try/Try"

const check = (x: number): Either<string, number> => (x > 0 ? Either.right(x) : Either.left(`bad ${x}`))
const positive = (x: number): number => {
  if (x <= 0) throw new Error(`bad ${x}`)
  return x
}

describe("traverse and sequence", () => {
  it("Either.traverse stops calling f at the first Left, like Option.traverse and Try.traverse", () => {
    const seen = { either: [] as number[], option: [] as number[], try: [] as number[] }
    const input = [1, -2, 3]

    const either = Either.traverse(input, (x) => (seen.either.push(x), check(x)))
    Option.traverse(input, (x) => (seen.option.push(x), x > 0 ? Option(x) : Option.none<number>()))
    Try.traverse(input, (x) => (seen.try.push(x), Try(() => positive(x))))

    expect(either.toJSON()).toEqual(Either.left("bad -2").toJSON())
    expect(seen.either).toEqual([1, -2])
    expect(seen.option).toEqual([1, -2])
    expect(seen.try).toEqual([1, -2])
  })

  it("Either.traverse collects the Rights in order and passes each index", () => {
    const indexes: number[] = []
    const result = Either.traverse([1, 2, 3], (x, i) => (indexes.push(i), check(x * 10)))
    expect(result.toJSON()).toEqual(Either.right([10, 20, 30]).toJSON())
    expect(indexes).toEqual([0, 1, 2])
    expect(Either.traverse([], check).toJSON()).toEqual(Either.right([]).toJSON())
  })

  it("traverse and sequence accept readonly arrays", () => {
    const values: ReadonlyArray<number> = [1, 2]
    const eithers: ReadonlyArray<Either<string, number>> = [Either.right(1), Either.right(2)]
    const options: ReadonlyArray<Option<number>> = [Option(1), Option(2)]
    const tries: ReadonlyArray<Try<number>> = [Try.success(1), Try.success(2)]

    expect(Either.traverse(values, check).toJSON()).toEqual(Either.right([1, 2]).toJSON())
    expect(Either.sequence(eithers).toJSON()).toEqual(Either.right([1, 2]).toJSON())
    expect(Option.sequence(options).toJSON()).toEqual(Option([1, 2]).toJSON())
    expect(Try.sequence(tries).toJSON()).toEqual(Try.success([1, 2]).toJSON())
  })
})
