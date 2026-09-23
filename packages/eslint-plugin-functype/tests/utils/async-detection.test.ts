import { parse } from "@typescript-eslint/parser"
import { describe, expect, it } from "vitest"

import { containsAwait } from "../../src/utils/async-detection"

const body = (code: string) => parse(code, { ecmaVersion: 2022, sourceType: "module" }).body[0]

describe("containsAwait", () => {
  it("finds an await in the statement's own control flow", () => {
    expect(containsAwait(body("async function f() { await x }"))).toBe(false) // the function is a boundary
    expect(containsAwait(body("for (const a of b) { await x }"))).toBe(true)
  })

  it("treats for await as awaiting", () => {
    expect(containsAwait(body("for await (const a of b) {}"))).toBe(true)
  })

  it("stops at nested arrow functions and function expressions", () => {
    expect(containsAwait(body("run(async () => { await x })"))).toBe(false)
    expect(containsAwait(body("run(async function () { await x })"))).toBe(false)
  })

  it("stops at class methods and class-property arrow functions", () => {
    expect(containsAwait(body("class A { async m() { await x } }"))).toBe(false)
    expect(containsAwait(body("class A { p = async () => { await x } }"))).toBe(false)
  })
})
