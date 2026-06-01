/**
 * Methods for different serialization formats
 */
export interface SerializationMethods<T> {
  toJSON(): string
  toYAML(): string
  toBinary(): string
}

/**
 * Shape of the envelope object emitted by a Serializable's instance-level
 * `toJSON()` (the method native `JSON.stringify` picks up via protocol).
 * Concrete types narrow this with their specific marker/tag literals.
 *
 * The `@functype` marker is the type discriminator (defends against
 * `_tag`-collision with Effect/fp-ts). `_tag` is the variant discriminator
 * within that type — kept across the board (variant-less types repeat the
 * marker for back-compat with 1.1.0 readers that did `parsed._tag === "List"`).
 *
 * Payload shape is type-specific: canonical types carry `value`; failure
 * branches (`Try.Failure`, `Task.Err`, `Lazy` with thrown thunk) carry
 * `error: SerializedError` instead.
 */
export interface SerializableEnvelope {
  readonly "@functype": string
  readonly _tag: string
  readonly [key: string]: unknown
}

export interface Serializable<out T> {
  serialize(): SerializationMethods<T>
  /**
   * Custom JSON serialization. Returns the canonical `@functype`-marked
   * envelope object so native `JSON.stringify` (and the rest of the JSON
   * `toJSON` protocol) emits a round-trip-able shape that
   * `Serialization.deserialize` can reconstruct.
   *
   * Added in 1.2.0. Concrete types narrow the return to their specific
   * marker/tag literals.
   */
  toJSON(): SerializableEnvelope
}
