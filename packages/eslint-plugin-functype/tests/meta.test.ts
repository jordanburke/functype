import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

import plugin from "../src/index"

describe("plugin meta", () => {
  it("reports the version in package.json", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8")) as { version: string }
    expect(plugin.meta).toEqual({ name: "eslint-plugin-functype", version: pkg.version })
  })
})
