# functype-react

## 0.60.6

### Patch Changes

- [#127](https://github.com/jordanburke/functype/pull/127) [`8c05537`](https://github.com/jordanburke/functype/commit/8c05537504e6a21d69d3093a687fae983a0c641c) Thanks [@jordanburke](https://github.com/jordanburke)! - Align `functype-react` to the family's shared version line. No code changes — this is a coordinated patch bump across all five publishable packages so they ship together at the same version going forward:
  - `functype`, `functype-os`, `functype-log`, `functype-mcp-server`: `0.60.5 → 0.60.6`
  - `functype-react`: `0.60.5 → 0.60.6` (jumped from initial `0.1.0` on npm; npm accepts the forward semver step)

  `functype-react@0.1.0` published via the local escape-hatch path; it has the same workspace deps and peers as the other 0.60.x packages, so the version jump is a label change rather than a code break for consumers.

- Updated dependencies [[`8c05537`](https://github.com/jordanburke/functype/commit/8c05537504e6a21d69d3093a687fae983a0c641c)]:
  - functype@0.60.6
