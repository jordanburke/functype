import { inspect } from "node:util"

import { describe, expect, it } from "vitest"

import { RightSpike } from "@/either/either-proto.spike"
import { SomeSpike } from "@/option/option-proto.spike"

describe("define() spike at runtime", () => {
  it("Some: behaves, prints by name, keeps only data as own keys", () => {
    const s = SomeSpike(1)
    expect(s.map((x) => x + 1).orElse(0)).toBe(2)
    expect(
      s.fold(
        () => 0,
        (x) => x * 10,
      ),
    ).toBe(10)
    expect(s.foldLeft(5)((acc, x) => acc + x)).toBe(6)
    expect(s.toString()).toBe("Some(1)")
    expect(JSON.stringify(s)).toBe('{"@functype":"Option","_tag":"Some","value":1}')
    expect(Object.keys(s)).toEqual(["_tag", "value"])
    expect(inspect(s)).toBe("Some [Option] { _tag: 'Some', value: 1 }")
    expect(Object.prototype.toString.call(s)).toBe("[object Option]")
    expect(SomeSpike(1)).toEqual(SomeSpike(1))
    expect(SomeSpike(1)).not.toEqual(SomeSpike(2))
    const forIn: string[] = []
    // eslint-disable-next-line functional/immutable-data -- collecting what for...in sees
    for (const k in s) forIn.push(k)
    expect(forIn).toEqual(["_tag", "value"])
  })

  it("Right: behaves, iterates, differs from Left in toEqual", () => {
    const r = RightSpike<string, number>(2)
    expect(r.map((x) => x * 2).orElse(0)).toBe(4)
    expect([...r]).toEqual([2])
    expect(r.merge(RightSpike<string, string>("b")).orElse([0, ""])).toEqual([2, "b"])
    expect(r.swap().isLeft()).toBe(true)
    expect(inspect(r)).toBe("Right [Either] { _tag: 'Right', value: 2 }")
  })

  it("a detached method call throws, which is the 2.0 break", () => {
    const s = SomeSpike(1)
    const { orElse } = s
    expect(() => orElse(0)).toThrow(TypeError)
  })
})
