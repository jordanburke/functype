/**
 * Internal safe stringify utility — replaces `safe-stable-stringify` dependency.
 *
 * Provides: circular reference detection, stable (sorted) key ordering,
 * no-throw guarantee, and respects the `toJSON()` protocol.
 */
export function safeStringify(value: unknown): string | undefined {
  if (value === undefined || typeof value === "symbol" || typeof value === "function") {
    return undefined
  }

  const seen = new Set<object>()

  function serialize(val: unknown): string | undefined {
    if (val === null) return "null"

    switch (typeof val) {
      case "string":
        return JSON.stringify(val)
      case "number":
        return isFinite(val) ? String(val) : "null"
      case "boolean":
        return String(val)
      case "bigint":
        return `"${val}"`
      case "undefined":
      case "symbol":
      case "function":
        return undefined
    }

    const obj = val as object
    if (seen.has(obj)) return '"[Circular]"'
    seen.add(obj)

    try {
      if ("toJSON" in obj && typeof (obj as Record<string, unknown>).toJSON === "function") {
        return serialize((obj as { toJSON: () => unknown }).toJSON())
      }

      if (Array.isArray(obj)) {
        return `[${obj.map((item) => serialize(item) ?? "null").join(",")}]`
      }

      const keys = Object.keys(obj).sort()
      const pairs: string[] = []
      for (const key of keys) {
        const v = serialize((obj as Record<string, unknown>)[key])
        if (v !== undefined) pairs.push(`${JSON.stringify(key)}:${v}`)
      }
      return `{${pairs.join(",")}}`
    } finally {
      seen.delete(obj)
    }
  }

  try {
    return serialize(value)
  } catch {
    return undefined
  }
}

/** True for an Error, including one from another realm (a `vm` context or iframe), where `instanceof` fails. */
const isError = (value: unknown): value is Error =>
  value instanceof Error || Object.prototype.toString.call(value) === "[object Error]"

/**
 * Renders a value for a container's `toString()`. An `Error` prints as `String(error)`
 * (`"TypeError: bad input"`), since `safeStringify` turns it into `{}`: an Error's name and message
 * are not own enumerable properties. Everything else goes through `safeStringify`.
 *
 * Never throws, like `safeStringify`: an Error whose `toString`, `name` or `message` throws (or a Proxy
 * over one) falls back to `safeStringify`.
 *
 * Display only. Serialization keeps using `safeStringify`, so wire formats are unchanged.
 */
export function showValue(value: unknown): string | undefined {
  try {
    return isError(value) ? String(value) : safeStringify(value)
  } catch {
    return safeStringify(value)
  }
}
