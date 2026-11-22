/** Run with `pnpm test:scripts`. CI runs it in `ci.yml` and in `publish.yml` before the gate. */
import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { classify, distTagFor, lineOf, planBump, previousTagFor } from "./publish-line.ts"

const functypeVersions = ["0.60.7", "1.0.0", "1.26.0", "1.27.1", "1.27.2", "1.0.0-beta.1"]
const eslintVersions = ["1.4.0", "2.0.5", "2.100.1", "2.126.0", "2.127.2"]

describe("lineOf", () => {
  it("is the major for the family", () => {
    assert.equal(lineOf("1.27.2", false), 1)
    assert.equal(lineOf("2.0.0", false), 2)
  })
  it("is the encoded functype major for the eslint pair", () => {
    assert.equal(lineOf("2.127.2", true), 1)
    assert.equal(lineOf("2.200.0", true), 2)
    assert.equal(lineOf("2.0.5", true), 0)
  })
  it("puts a pair version from before the encoding on no line", () => {
    assert.equal(lineOf("1.4.0", true), -1)
  })
})

describe("classify", () => {
  it("names the semver step", () => {
    assert.equal(classify("1.27.3", "1.27.2"), "patch")
    assert.equal(classify("1.28.0", "1.27.2"), "minor")
    assert.equal(classify("2.0.0", "1.27.2"), "major")
    assert.equal(classify("1.27.2", "1.27.2"), "same")
    assert.equal(classify("1.27.1", "1.27.2"), "downgrade")
  })
})

describe("planBump before 2.0.0 ships", () => {
  it("is a patch for the next 1.x", () => {
    const plan = planBump({ local: "1.27.3", published: functypeVersions, latest: "1.27.2", mirror: false })
    assert.deepEqual(plan, { npm: "1.27.2", bump: "patch" })
  })
  it("is a major for functype 2.0.0", () => {
    const plan = planBump({ local: "2.0.0", published: functypeVersions, latest: "1.27.2", mirror: false })
    assert.deepEqual(plan, { npm: "1.27.2", bump: "major" })
  })
  it("is a minor for the eslint pair's 2.200.0, as semver sees it", () => {
    const plan = planBump({ local: "2.200.0", published: eslintVersions, latest: "2.127.2", mirror: true })
    assert.deepEqual(plan, { npm: "2.127.2", bump: "minor" })
  })
  it("is new for a package npm has never seen", () => {
    assert.deepEqual(planBump({ local: "1.0.0", published: [], latest: null, mirror: false }), {
      npm: null,
      bump: "new",
    })
  })
})

describe("planBump after 2.0.0 is latest", () => {
  const family = [...functypeVersions, "2.0.0"]
  const pair = [...eslintVersions, "2.200.0"]

  it("is a patch for a 1.x fix, not a downgrade from latest", () => {
    assert.deepEqual(planBump({ local: "1.27.3", published: family, latest: "2.0.0", mirror: false }), {
      npm: "1.27.2",
      bump: "patch",
    })
  })
  it("is a patch for the pair's 1.x mirror, not a downgrade from 2.200.0", () => {
    assert.deepEqual(planBump({ local: "2.127.3", published: pair, latest: "2.200.0", mirror: true }), {
      npm: "2.127.2",
      bump: "patch",
    })
  })
  it("is a patch for 2.0.1 on the new line", () => {
    assert.deepEqual(planBump({ local: "2.0.1", published: family, latest: "2.0.0", mirror: false }), {
      npm: "2.0.0",
      bump: "patch",
    })
    assert.deepEqual(planBump({ local: "2.200.1", published: pair, latest: "2.200.0", mirror: true }), {
      npm: "2.200.0",
      bump: "patch",
    })
  })
  it("still refuses a 1.x version below the line's highest", () => {
    assert.equal(planBump({ local: "1.27.1", published: family, latest: "2.0.0", mirror: false }).bump, "downgrade")
    assert.equal(planBump({ local: "2.127.1", published: pair, latest: "2.200.0", mirror: true }).bump, "downgrade")
  })
  it("refuses to start a line below latest's", () => {
    assert.equal(
      planBump({ local: "0.70.0", published: ["1.0.0", "2.0.0"], latest: "2.0.0", mirror: false }).bump,
      "downgrade",
    )
  })
  it("ignores prereleases", () => {
    assert.equal(planBump({ local: "1.0.0", published: ["1.0.0-beta.1"], latest: null, mirror: false }).bump, "new")
  })
})

describe("distTagFor", () => {
  it("is latest while the release is on latest's line", () => {
    assert.equal(distTagFor("1.27.3", "1.27.2"), "latest")
  })
  it("is latest for the release that starts a new line", () => {
    assert.equal(distTagFor("2.0.0", "1.27.2"), "latest")
  })
  it("is latest-1 for a 1.x release after 2.0.0", () => {
    assert.equal(distTagFor("1.27.3", "2.0.0"), "latest-1")
  })
  it("is latest when npm has no functype", () => {
    assert.equal(distTagFor("1.0.0", null), "latest")
  })
})

describe("previousTagFor", () => {
  const tags = ["v1.27.1", "v1.27.2", "v2.0.0", "v2.0.1", "v1.26.0", "v1.28.0-rc.1"]
  it("is the highest earlier tag on the same major", () => {
    assert.equal(previousTagFor("v1.27.3", tags), "v1.27.2")
    assert.equal(previousTagFor("v2.0.2", tags), "v2.0.1")
  })
  it("is undefined for a line's first release", () => {
    assert.equal(previousTagFor("v3.0.0", tags), undefined)
  })
})
