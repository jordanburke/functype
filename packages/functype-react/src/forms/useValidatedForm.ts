"use client"

import { List, type List as ListT } from "functype"
import { type FormEvent, useCallback, useMemo, useState } from "react"

import type { Validated } from "./Validated"

/**
 * Form-level state container with applicative error accumulation.
 *
 * The consumer-provided `validate` is the canonical place to accumulate
 * field-level errors. A common pattern:
 *
 * ```ts
 * const validate = (s: Form): Validated<string, Form> => {
 *   const errs = List<string>([])
 *     .concat(s.email.includes("@") ? List([]) : List(["email must contain @"]))
 *     .concat(s.age >= 18 ? List([]) : List(["age must be 18+"]))
 *   return errs.isEmpty ? valid(s) : invalid(errs)
 * }
 * ```
 *
 * `handleSubmit(onValid)` returns an event handler that calls `e.preventDefault()`
 * and only invokes `onValid` when the current form value passes validation.
 */
export function useValidatedForm<S extends Record<string, unknown>, E = string>(opts: {
  readonly initial: S
  readonly validate: (s: S) => Validated<E, S>
}): {
  readonly values: S
  setField: <K extends keyof S>(key: K, value: S[K]) => void
  readonly validation: Validated<E, S>
  readonly errors: ListT<E>
  readonly isValid: boolean
  reset: () => void
  handleSubmit: (onValid: (s: S) => void | Promise<void>) => (e: FormEvent) => void
} {
  const [values, setValues] = useState<S>(opts.initial)

  const setField = useCallback(<K extends keyof S>(key: K, value: S[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const reset = useCallback(() => setValues(opts.initial), [opts.initial])

  const validation = useMemo(() => opts.validate(values), [opts, values])
  const errors = useMemo(
    () =>
      validation.fold(
        (es) => es,
        () => List.empty<E>(),
      ),
    [validation],
  )
  const isValid = validation.isRight()

  const handleSubmit = useCallback(
    (onValid: (s: S) => void | Promise<void>) => (e: FormEvent) => {
      e.preventDefault()
      validation.fold(
        () => undefined,
        (s) => {
          void onValid(s)
        },
      )
    },
    [validation],
  )

  return { values, setField, validation, errors, isValid, reset, handleSubmit }
}
