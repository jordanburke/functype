import type { Option } from "functype/option"
import type { ReactElement, ReactNode } from "react"

/**
 * Tag-narrowed sugar over `Match` for `Option<A>`. Renders `Some(a)` to the
 * `Some` handler and `None` to the `None` handler.
 */
export function MatchOption<A>(props: {
  readonly value: Option<A>
  readonly Some: (a: A) => ReactNode
  readonly None: () => ReactNode
}): ReactElement {
  return <>{props.value.fold(props.None, props.Some)}</>
}
