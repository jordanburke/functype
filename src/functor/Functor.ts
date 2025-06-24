import type { Type } from "@/types"

/**
 * Functor type class - supports mapping over wrapped values
 *
 * Laws:
 * - Identity: fa.map(x => x) ≡ fa
 * - Composition: fa.map(f).map(g) ≡ fa.map(x => g(f(x)))
 */
export interface Functor<A extends Type> {
  map<B extends Type>(f: (value: A) => B): Functor<B>
}

/**
 * Applicative functor - supports applying wrapped functions to wrapped values
 *
 * Laws:
 * - Identity: pure(x => x).ap(v) ≡ v
 * - Composition: pure(compose).ap(u).ap(v).ap(w) ≡ u.ap(v.ap(w))
 * - Homomorphism: pure(f).ap(pure(x)) ≡ pure(f(x))
 * - Interchange: u.ap(pure(y)) ≡ pure(f => f(y)).ap(u)
 */
export interface Applicative<A extends Type> extends Functor<A> {
  ap<B extends Type>(ff: Applicative<(value: A) => B>): Applicative<B>
}

/**
 * Monad type class - supports flat mapping (chaining) operations
 *
 * Laws:
 * - Left identity: pure(a).flatMap(f) ≡ f(a)
 * - Right identity: m.flatMap(pure) ≡ m
 * - Associativity: m.flatMap(f).flatMap(g) ≡ m.flatMap(x => f(x).flatMap(g))
 */
export interface Monad<A extends Type> extends Applicative<A> {
  flatMap<B extends Type>(f: (value: A) => Monad<B>): Monad<B>
}

/**
 * Async monad - supports asynchronous monadic operations
 * Extends Monad so it has map, ap, and flatMap in addition to flatMapAsync
 */
export interface AsyncMonad<A extends Type> extends Monad<A> {
  flatMapAsync<B extends Type>(f: (value: A) => PromiseLike<AsyncMonad<B>>): PromiseLike<AsyncMonad<B>>
}
