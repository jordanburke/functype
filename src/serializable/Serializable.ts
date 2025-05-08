/**
 * Methods for different serialization formats
 */
export type SerializationMethods<T> = {
  toJSON(): string
  toYAML(): string
  toBinary(): string
}

export type Serializable<T> = {
  serialize(): SerializationMethods<T>
}
