/**
 * Internal base64 codec for `toBinary` / `fromBinary`, built only on WinterTC
 * globals (`TextEncoder`, `TextDecoder`, `btoa`, `atob`) so it runs on Node,
 * Cloudflare Workers without `nodejs_compat`, Deno, Bun and browsers.
 *
 * The output is byte-identical to `Buffer.from(text).toString("base64")`: text
 * goes through UTF-8 first, which is what `Buffer` does and what plain
 * `btoa(text)` does not (it throws on any character above U+00FF).
 *
 * The globals are only touched inside the functions, never at import, so
 * importing functype still works where they are missing (Jest 29's jsdom has
 * no `TextEncoder`); only `toBinary` / `fromBinary` would fail there.
 */

/** Bytes per `String.fromCharCode` call; spreading a large array into one call overflows the stack. */
const CHUNK_SIZE = 0x8000

/** UTF-8 encode `text`, then base64 encode the bytes. */
export const utf8ToBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text)
  const chunks = Array.from({ length: Math.ceil(bytes.length / CHUNK_SIZE) }, (_, i) =>
    String.fromCharCode(...bytes.subarray(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)),
  )
  return btoa(chunks.join(""))
}

/**
 * Base64 decode `base64`, then UTF-8 decode the bytes.
 *
 * Accepts strict base64 plus embedded whitespace, missing padding and the
 * URL-safe alphabet (`-` and `_`). Other malformed input, such as a character
 * outside the alphabet, throws `atob`'s `InvalidCharacterError`, where
 * `Buffer` silently skipped it. A leading byte-order mark is kept, as `Buffer` keeps it.
 */
export const base64ToUtf8 = (base64: string): string => {
  const standard = base64.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/")
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, "=")
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  // eslint-disable-next-line functional/no-let, functional/immutable-data -- byte copy; Uint8Array.from(binary, fn) was 18x slower on 2 MB
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes)
}
