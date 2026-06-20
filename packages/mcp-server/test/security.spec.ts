import { describe, expect, it } from "vitest"

import { isSafeFunctypeVersion } from "../src/index"

// GHSA-wcjj-9m6g-2fr2: set_functype_version must reject any specifier that
// pnpm would interpret as an alias to an arbitrary local/remote package.
describe("isSafeFunctypeVersion", () => {
  describe("accepts", () => {
    const accepted = [
      "1.4.4",
      "1.4",
      "1",
      "v1.4.4",
      "^1.4.0",
      "~1.4.0",
      "1.4.4-beta.1",
      "1.4.4-rc.0+build.7",
      "latest",
      "next",
      "beta",
      "alpha",
      "canary",
      "rc",
    ]
    for (const v of accepted) {
      it(`"${v}"`, () => {
        expect(isSafeFunctypeVersion(v)).toBe(true)
      })
    }
  })

  describe("rejects", () => {
    const rejected = [
      // The actual exploit payloads
      "file:/tmp/evil",
      "file:./evil",
      "npm:evil-functype@1.0.0",
      "git+https://github.com/attacker/evil.git",
      "https://attacker.example/evil.tgz",
      "github:attacker/evil",
      // Whitespace / control characters
      " 1.4.4",
      "1.4.4 ",
      "1.4.4\n",
      "1.4.4 || file:/evil",
      // Embedded separators that would change the package identity
      "functype@1.4.4",
      "../evil",
      "C:\\evil",
      // Garbage / empty
      "",
      "not-a-version",
      "1.4.4; rm -rf /",
    ]
    for (const v of rejected) {
      it(`"${v}"`, () => {
        expect(isSafeFunctypeVersion(v)).toBe(false)
      })
    }
  })
})
