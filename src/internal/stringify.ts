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
