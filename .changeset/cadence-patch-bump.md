---
"functype": patch
"functype-os": patch
"functype-log": patch
"functype-mcp-server": patch
"functype-react": patch
---

Align `functype-react` to the family's shared version line. No code changes — this is a coordinated patch bump across all five publishable packages so they ship together at the same version going forward:

- `functype`, `functype-os`, `functype-log`, `functype-mcp-server`: `0.60.5 → 0.60.6`
- `functype-react`: `0.60.5 → 0.60.6` (jumped from initial `0.1.0` on npm; npm accepts the forward semver step)

`functype-react@0.1.0` published via the local escape-hatch path; it has the same workspace deps and peers as the other 0.60.x packages, so the version jump is a label change rather than a code break for consumers.
