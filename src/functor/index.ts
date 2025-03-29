export type SingleType = unknown

export type ArrayType = SingleType[]

export type Type = SingleType | ArrayType | never

export type AbstractFunctor<A extends Type> = {
  map(f: (value: A) => Type): AbstractFunctor<Type>

  flatMap(f: (value: A) => AbstractFunctor<Type>): AbstractFunctor<Type>
}

export type Functor<A extends Type> = AbstractFunctor<A> & {
  map<B extends Type>(f: (value: A) => B): Functor<B>

  flatMap<B extends Type>(f: (value: A) => Functor<B>): Functor<B>
}

export type AsyncFunctor<A extends Type> = {
  flatMapAsync(f: (value: A) => PromiseLike<AsyncFunctor<A>>): PromiseLike<AsyncFunctor<A>>
}

export type ArrayFunctor<A extends ArrayType> = AbstractFunctor<A> & {
  map<U extends ArrayType>(f: (value: A) => U): ArrayFunctor<U>

  flatMap<U extends ArrayType>(f: (value: A) => ArrayFunctor<U>): ArrayFunctor<U>
}
