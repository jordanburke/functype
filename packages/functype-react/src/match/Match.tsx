import type { ReactElement, ReactNode } from "react"

/**
 * Maps each `_tag` literal to a handler that receives the narrowed variant.
 *
 * TypeScript enforces exhaustiveness: omitting a case from `children` is a
 * compile error.
 */
export type MatchCases<U extends { _tag: string }> = {
  readonly [K in U["_tag"]]: (value: Extract<U, { readonly _tag: K }>) => ReactNode
}

/**
 * Generic discriminated-union matcher for ADTs that follow functype's `_tag`
 * convention. Pass a value and a record of handlers keyed on each tag; the
 * matching handler is invoked with the narrowed variant.
 *
 * ```tsx
 * <Match value={state}>
 *   {{
 *     Loading: () => <Spinner />,
 *     Success: ({ data }) => <Result data={data} />,
 *     Failure: ({ error }) => <Err err={error} />,
 *   }}
 * </Match>
 * ```
 */
export function Match<U extends { _tag: string }>(props: {
  readonly value: U
  readonly children: MatchCases<U>
}): ReactElement {
  const handler = props.children[props.value._tag as U["_tag"]] as (value: U) => ReactNode
  return <>{handler(props.value)}</>
}
