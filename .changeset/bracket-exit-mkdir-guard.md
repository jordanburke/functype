---
"functype": patch
"functype-os": patch
"functype-log": patch
"functype-react": patch
"functype-mcp-server": patch
"eslint-config-functype": patch
"eslint-plugin-functype": patch
---

Family-cadence patch release.

- **functype** — Adds `IO.bracketExit(acquire, use, release)`. Same shape as `IO.bracket`, but the `release` callback receives the use-step's `Exit<E, A>` so cleanup can branch on success vs failure (matches the Effect-TS / ZIO / cats-effect convention). Existing `IO.bracket` is unchanged. Closes #136.
- **functype-os** — `Fs.mkdir` and `Fs.mkdirSync` now refuse `recursive: true` under Linux magic filesystem roots (`/proc/`, `/sys/`, `/dev/`) and return `Left(FsError(...))` immediately. Fixes the indefinite hang reported on Linux where libuv blocks instead of erroring fast. Cross-platform behavior is now predictable. Closes #135.
