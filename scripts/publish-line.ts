/**
 * Which release line a version belongs to, and what a publish means against npm. Pure, so
 * `publish-line.test.ts` covers it; `check-publish-safety.ts` and `publish-tag.ts` use it.
 *
 * A line is the functype major a version ships for. For the functype family that's the
 * package's own major. For the eslint pair it's encoded in the minor: `2.{major*100 + minor}.patch`
 * (see `sync-eslint-mirror.ts`), so `2.127.2` is on line 1 and `2.200.0` is on line 2.
 *
 * Once 2.0.0 is `latest`, a 1.x release publishes below it. Comparing each package with
 * `latest` would call that a downgrade, so a version is compared with the highest published
 * version on its own line instead.
 */

export type BumpKind = "patch" | "minor" | "major" | "downgrade" | "same" | "new"

type Parts = readonly [number, number, number]

const parse = (version: string): Parts => {
  const [major = 0, minor = 0, patch = 0] = version.split(".").map(Number)
  return [major, minor, patch]
}

const compare = (a: string, b: string): number => {
  const [aMaj, aMin, aPat] = parse(a)
  const [bMaj, bMin, bPat] = parse(b)
  return aMaj - bMaj || aMin - bMin || aPat - bPat
}

/** Prereleases and snapshots aren't on any line: a release never compares against them. */
const isRelease = (version: string): boolean => /^\d+\.\d+\.\d+$/.test(version)

/**
 * The functype line a version ships for. `mirror` is true for the eslint pair. A pair version
 * from before the mirror encoding (major other than 2) is on no line, so it gets -1.
 */
export const lineOf = (version: string, mirror: boolean): number => {
  const [major, minor] = parse(version)
  if (!mirror) return major
  return major === 2 ? Math.floor(minor / 100) : -1
}

/** The semver step from `from` to `to`, as the release would take it. */
export const classify = (to: string, from: string): BumpKind => {
  if (to === from) return "same"
  if (compare(to, from) < 0) return "downgrade"
  const [toMaj, toMin] = parse(to)
  const [fromMaj, fromMin] = parse(from)
  if (toMaj > fromMaj) return "major"
  if (toMin > fromMin) return "minor"
  return "patch"
}

export type BumpPlan = {
  /** The version the bump is measured from: the highest on the local version's line, or `latest` for a new line. */
  readonly npm: string | null
  readonly bump: BumpKind
}

/**
 * What publishing `local` would be, given every version npm has and its `latest`.
 *
 * - On a line npm already has: compared with that line's highest version, so a 1.x patch after
 *   2.0.0 is a patch, and a version at or below that line's highest is a downgrade.
 * - On a new line above `latest`'s: compared with `latest`, so functype 2.0.0 is a major and the
 *   eslint pair's 2.200.0 is a minor, as semver sees them.
 * - On a new line below `latest`'s: a downgrade. Nothing should start an old line.
 */
export const planBump = (input: {
  readonly local: string
  readonly published: ReadonlyArray<string>
  readonly latest: string | null
  readonly mirror: boolean
}): BumpPlan => {
  const { local, latest, mirror } = input
  const published = input.published.filter(isRelease)
  if (published.length === 0) return { npm: null, bump: "new" }
  const line = lineOf(local, mirror)
  const onLine = published.filter((version) => lineOf(version, mirror) === line).sort(compare)
  const highest = onLine[onLine.length - 1]
  if (highest !== undefined) return { npm: highest, bump: classify(local, highest) }
  const top = latest ?? [...published].sort(compare)[published.length - 1] ?? local
  if (line > lineOf(top, mirror)) return { npm: top, bump: classify(local, top) }
  return { npm: top, bump: "downgrade" }
}

/**
 * The npm dist-tag a release publishes under. `latest` while the release is on `latest`'s line or
 * above; `latest-<major>` for an older line, so a 1.x fix after 2.0.0 doesn't take `latest` back.
 * Not `v1` or `1.x`: npm refuses a tag that parses as a semver range.
 */
export const distTagFor = (localFunctype: string, latestFunctype: string | null): string => {
  if (latestFunctype === null) return "latest"
  const [local] = parse(localFunctype)
  const [latest] = parse(latestFunctype)
  return local < latest ? `latest-${local}` : "latest"
}

/**
 * The tag a release's notes start from: the highest `v<major>.*` tag below this one on the same
 * major, or undefined for a line's first release, where GitHub's own choice is right.
 */
export const previousTagFor = (tag: string, tags: ReadonlyArray<string>): string | undefined => {
  const version = tag.replace(/^v/, "")
  const [major] = parse(version)
  return tags
    .map((t) => t.replace(/^v/, ""))
    .filter((v) => isRelease(v) && parse(v)[0] === major && compare(v, version) < 0)
    .sort(compare)
    .map((v) => `v${v}`)
    .pop()
}
