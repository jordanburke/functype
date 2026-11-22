/**
 * Call a function a value holds as data, such as an IO step's callback or a Layer recipe's
 * factory, without a receiver. Called as `step.f(x)`, it would get the step itself as `this`, so a
 * detached method passed in, such as `IO.sync(ref.get)` or `.map(ref.set)`, read and wrote the
 * step's fields and reported success. Called alone, it throws, as a detached call should, and the
 * interpreter turns the throw into a `Die`.
 *
 * One per arity, not one with rest arguments: these sit on the interpreter's hot path, where a
 * rest-argument call measured about 13% slower over a 50-step `run()`.
 */
export const callAlone0 = <R>(f: () => R): R => f()

export const callAlone1 = <A, R>(f: (a: A) => R, a: A): R => f(a)

export const callAlone2 = <A, B, R>(f: (a: A, b: B) => R, a: A, b: B): R => f(a, b)
