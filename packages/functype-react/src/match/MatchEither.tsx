import type { Either } from "functype/either"
import type { ReactElement, ReactNode } from "react"

/**
 * Tag-narrowed sugar over `Match` for `Either<L, R>`.
 */
export function MatchEither<L, R>(props: {
  readonly value: Either<L, R>
  readonly Left: (l: L) => ReactNode
  readonly Right: (r: R) => ReactNode
}): ReactElement {
  return <>{props.value.fold(props.Left, props.Right)}</>
}
