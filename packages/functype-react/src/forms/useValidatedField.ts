"use client"

import { List, type List as ListT } from "functype"
import { type ChangeEvent, useCallback, useMemo, useState } from "react"

import type { Validated } from "./Validated"

/**
 * Single-field state container with continuously-derived validation.
 *
 * `validation` is re-derived from `validate(value)` on every render — keep
 * `validate` cheap or memoize the callback.
 *
 * `bind()` returns props ready to spread onto a native `<input>`. The
 * generic `A` may be any value type; `bind` is most useful when `A` is
 * string-shaped. For non-string fields, wire `value`/`setValue` directly.
 */
export function useValidatedField<A, E = string>(opts: {
  readonly initial: A
  readonly validate: (a: A) => Validated<E, A>
}): {
  readonly value: A
  setValue: (a: A) => void
  readonly validation: Validated<E, A>
  readonly errors: ListT<E>
  readonly isValid: boolean
  bind: () => { value: A; onChange: (e: ChangeEvent<HTMLInputElement>) => void }
} {
  const [value, setValue] = useState<A>(opts.initial)

  const validation = useMemo(() => opts.validate(value), [opts, value])
  const errors = useMemo(
    () =>
      validation.fold(
        (es) => es,
        () => List.empty<E>(),
      ),
    [validation],
  )
  const isValid = validation.isRight()

  const bind = useCallback(
    () => ({
      value,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setValue(e.target.value as unknown as A),
    }),
    [value],
  )

  return { value, setValue, validation, errors, isValid, bind }
}
