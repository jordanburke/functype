import stringify from "safe-stable-stringify"

export type SerializableTypes = "json" | "yaml"

type SerializationMethods<T> = {
  json: {
    toJSON(): string
    fromJSON(json: string): T
  }
  yaml: {
    toYAML(): string
    fromYAML(yaml: string): T
  }
}

export type Serializable<STypes extends SerializableTypes[], T> = T &
  (STypes extends []
    ? NonNullable<unknown>
    : STypes extends [infer First, ...infer Rest]
      ? First extends keyof SerializationMethods<T>
        ? SerializationMethods<T>[First] & Serializable<Rest extends SerializableTypes[] ? Rest : [], T>
        : never
      : never)

// Helper type to extract supported serialization types
export type SupportedSerializationTypes<T> = T extends Serializable<infer Types, never> ? Types : never

// Helper function to create a Serializable object
export function createSerializable<STypes extends SerializableTypes[], T>(
  obj: T,
  serializationMethods: Pick<SerializationMethods<T>, STypes[number]>,
): Serializable<STypes, T> {
  return {
    ...obj,
    ...serializationMethods,
  } as Serializable<STypes, T>
}

// Example usage
type MyData = {
  name: string
  age: number
}

const mySerializableData = createSerializable<["json", "yaml"], MyData>(
  {
    name: "John",
    age: 30,
  },
  {
    json: {
      toJSON() {
        return stringify(this)
      },
      fromJSON(json: string) {
        return JSON.parse(json)
      },
    },
    yaml: {
      toYAML() {
        return Object.entries(this)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n")
      },
      fromYAML(yaml: string) {
        return Object.fromEntries(yaml.split("\n").map((line) => line.split(": ")))
      },
    },
  },
)

console.log(mySerializableData.toJSON()) // {"name":"John","age":30}
console.log(mySerializableData.toYAML()) // name: John\nage: 30

// Type checking
type SupportedTypes = SupportedSerializationTypes<typeof mySerializableData> // ["json", "yaml"]
