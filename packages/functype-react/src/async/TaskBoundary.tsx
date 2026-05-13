"use client"

import { Component, type ErrorInfo, type ReactElement, type ReactNode, Suspense } from "react"

type Props = {
  readonly pending: ReactNode
  readonly fallback: (error: unknown, reset: () => void) => ReactNode
  readonly children: ReactNode
}

type State = { readonly _tag: "Ok" } | { readonly _tag: "Errored"; readonly error: unknown }

class TaskErrorBoundary extends Component<
  { readonly fallback: Props["fallback"]; readonly children: ReactNode },
  State
> {
  override state: State = { _tag: "Ok" }

  static getDerivedStateFromError(error: unknown): State {
    return { _tag: "Errored", error }
  }

  override componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    // hook for telemetry; intentionally noop in v0.1
  }

  reset = (): void => {
    this.setState({ _tag: "Ok" })
  }

  override render(): ReactNode {
    if (this.state._tag === "Errored") {
      return this.props.fallback(this.state.error, this.reset)
    }
    return this.props.children
  }
}

/**
 * Combines `<Suspense>` (for pending Tasks consumed via `useTaskValue`) with
 * an ErrorBoundary that catches thrown failures. The `fallback` render prop
 * receives the thrown value (typed `unknown` — consumers narrow) and a
 * `reset` callback that clears the error so children can be re-attempted.
 *
 * The ErrorBoundary wraps the Suspense, matching React's documented rule
 * (otherwise Suspense would catch errors instead of the boundary).
 */
export function TaskBoundary(props: Props): ReactElement {
  return (
    <TaskErrorBoundary fallback={props.fallback}>
      <Suspense fallback={props.pending}>{props.children}</Suspense>
    </TaskErrorBoundary>
  )
}
