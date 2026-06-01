# Archived proposals

Design docs for completed work, archived for context. Sorted by shipping order.

| Proposal | Drove release | One-line summary |
|---|---|---|
| [`serializable-audit.md`](./serializable-audit.md) | 1.2.0 | Audit of pre-1.2.0 serialization gaps — only `Either` had instance `toJSON`; other ADTs produced messy property-bag output. Drove the universal-deserialize work. |
| [`serializable-audit-q1-q2.md`](./serializable-audit-q1-q2.md) | 1.2.0 | Q1 (Lazy semantics) + Q2 (Error fidelity) design decisions — Lazy forces on serialize, Error preserves name/message/stack/cause but not subclass identity. |
| [`universal-deserialize.md`](./universal-deserialize.md) | 1.2.0 | Top-level `Serialization.deserialize(json)` proposal — walks parsed JSON, reconstructs any value with the `@functype` marker via per-type dispatch. |
| [`universal-deserialize-changes.md`](./universal-deserialize-changes.md) | 1.2.0 | Spec for Changes 0–3 of the universal-deserialize work — envelope marker, instance `toJSON`, namespace API, conformance test. |
| [`serialization-1.2.1-followups.md`](./serialization-1.2.1-followups.md) | 1.2.1 + 1.2.2 | Post-1.2.0 conformance review from civala's PDOS engine. Verified the universal codec is correct; drove `toEnvelope`/`fromEnvelope`/`deserializeStrict` in 1.2.1 and the `JSONValue` type tightening in 1.2.2. |

Active proposals (work-in-progress) live in `docs/proposals/`. Once a proposal ships, move it to `docs/archive/proposals/` and add a row above.
