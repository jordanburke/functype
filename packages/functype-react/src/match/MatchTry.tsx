import type { Try } from "functype/try"
import type { ReactElement, ReactNode } from "react"

/**
 * Tag-narrowed sugar over `Match` for `Try<A>`. `Failure` receives the
 * underlying `Error`; `Success` receives the value.
 */
export function MatchTry<A>(props: {
  readonly value: Try<A>
  readonly Success: (a: A) => ReactNode
  readonly Failure: (e: Error) => ReactNode
}): ReactElement {
  return <>{props.value.fold(props.Failure, props.Success)}</>
}
