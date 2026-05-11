/**
 * Methods for different serialization formats
 */
export interface SerializationMethods<T> {
  toJSON(): string
  toYAML(): string
  toBinary(): string
}

export interface Serializable<out T> {
  serialize(): SerializationMethods<T>
}
