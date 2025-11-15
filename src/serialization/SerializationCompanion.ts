import stringify from "safe-stable-stringify"

/**
 * Serialization result containing methods for different formats
 */
export interface SerializationResult {
  /** Serializes to JSON string */
  toJSON: () => string
  /** Serializes to YAML string */
  toYAML: () => string
  /** Serializes to base64-encoded binary string */
  toBinary: () => string
}

/**
 * Creates a serializer for a simple tagged value
 * @param tag - The type tag (e.g., "Some", "List", "Success")
 * @param value - The value to serialize
 * @returns Serialization methods
 */
export const createSerializer = (tag: string, value: unknown): SerializationResult => ({
  toJSON: () => JSON.stringify({ _tag: tag, value }),
  toYAML: () => `_tag: ${tag}\nvalue: ${stringify(value)}`,
  toBinary: () => Buffer.from(JSON.stringify({ _tag: tag, value })).toString("base64"),
})

/**
 * Creates a serializer for complex objects with custom serialization logic
 * @param data - The data object to serialize (should include _tag)
 * @returns Serialization methods
 */
export const createCustomSerializer = (data: Record<string, unknown>): SerializationResult => ({
  toJSON: () => JSON.stringify(data),
  toYAML: () => {
    const entries = Object.entries(data)
    return entries.map(([key, val]) => `${key}: ${stringify(val)}`).join("\n")
  },
  toBinary: () => Buffer.from(JSON.stringify(data)).toString("base64"),
})

/**
 * Generic deserializer from JSON
 * @param json - The JSON string to parse
 * @param reconstructor - Function to reconstruct the type from parsed data
 * @returns Reconstructed instance
 */
export const fromJSON = <T>(
  json: string,
  reconstructor: (parsed: { _tag: string; [key: string]: unknown }) => T,
): T => {
  const parsed = JSON.parse(json) as { _tag: string; [key: string]: unknown }
  return reconstructor(parsed)
}

/**
 * Generic deserializer from YAML (simple format)
 * @param yaml - The YAML string to parse
 * @param reconstructor - Function to reconstruct the type from parsed data
 * @returns Reconstructed instance
 */
export const fromYAML = <T>(
  yaml: string,
  reconstructor: (parsed: { _tag: string; [key: string]: unknown }) => T,
): T => {
  const lines = yaml.split("\n")
  const parsed: Record<string, unknown> = {}

  for (const line of lines) {
    const colonIndex = line.indexOf(": ")
    if (colonIndex === -1) continue

    const key = line.substring(0, colonIndex)
    const valueStr = line.substring(colonIndex + 2)

    if (!valueStr) {
      parsed[key] = null
      continue
    }

    // Try to parse as JSON, otherwise use as string
    try {
      parsed[key] = valueStr === "null" ? null : JSON.parse(valueStr)
    } catch {
      parsed[key] = valueStr
    }
  }

  return reconstructor(parsed as { _tag: string; [key: string]: unknown })
}

/**
 * Generic deserializer from binary (base64-encoded JSON)
 * @param binary - The base64-encoded binary string
 * @param reconstructor - Function to reconstruct the type from parsed data
 * @returns Reconstructed instance
 */
export const fromBinary = <T>(
  binary: string,
  reconstructor: (parsed: { _tag: string; [key: string]: unknown }) => T,
): T => {
  const json = Buffer.from(binary, "base64").toString()
  return fromJSON(json, reconstructor)
}

/**
 * Creates companion serialization methods for a type
 * @param reconstructor - Function to reconstruct the type from parsed data
 * @returns Companion methods object with fromJSON, fromYAML, and fromBinary
 */
export const createSerializationCompanion = <T>(
  reconstructor: (parsed: { _tag: string; [key: string]: unknown }) => T,
) => ({
  fromJSON: (json: string) => fromJSON(json, reconstructor),
  fromYAML: (yaml: string) => fromYAML(yaml, reconstructor),
  fromBinary: (binary: string) => fromBinary(binary, reconstructor),
})
