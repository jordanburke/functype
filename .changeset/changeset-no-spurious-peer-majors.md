---
"functype": patch
---

(no-op release — fixes Changesets config to prevent spurious peer-dep major-bump cascades; ships as a trivial patch to force the Version Packages PR to regenerate with correct version bumps for all packages)

Adds `___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH.onlyUpdatePeerDependentsWhenOutOfRange: true` to `.changeset/config.json`. Without this option, Changesets's default behavior force-major-bumps any package that peer-depends on a changing workspace package — even when the new version is still inside the peer-dep range. That's why `functype-os`, `functype-log`, and `functype-react` got bumped to `2.0.0` when `functype` only went `1.0.1 → 1.1.0` (their peer range `>=0.60.0` accepts `1.1.0` cleanly). With the option enabled, peer-dep dependents only major-bump when the new version is *actually* out of range — exactly what the post-0.60.7 cascade post-mortem assumed was already the behavior.
