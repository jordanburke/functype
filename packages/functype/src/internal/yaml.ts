/** Splits YAML into lines, accepting `\n` and `\r\n` line endings. */
export const yamlLines = (yaml: string): string[] => yaml.split(/\r?\n/)

/**
 * True when the YAML has a `key: value` line whose value isn't empty. The shared YAML parser reads an
 * empty value as `null`, which can't be told apart from a written `null`, so the companions use this
 * to reject a missing or empty value as bad input, as they did before 1.27.0.
 */
export const hasYAMLValue = (yaml: string, key: string): boolean =>
  yamlLines(yaml).some((line) => {
    const colonIndex = line.indexOf(": ")
    return (
      colonIndex !== -1 && line.substring(0, colonIndex).trim() === key && line.substring(colonIndex + 2).trim() !== ""
    )
  })
