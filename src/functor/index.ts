export type SingleType = any

export type ArrayType = SingleType[]

export type Type = SingleType | ArrayType

export type _AbstractFunctor_<A extends Type> = {
  map(f: (value: A) => Type): _AbstractFunctor_<Type>

  flatMap(f: (value: A) => _AbstractFunctor_<Type>): _AbstractFunctor_<Type>
}

export type _Functor_<A extends Type> = _AbstractFunctor_<A> & {
  map<B extends Type>(f: (value: A) => B): _Functor_<B>

  flatMap<B extends Type>(f: (value: A) => _Functor_<B>): _Functor_<B>
}

export type _ArrayFunctor_<A extends ArrayType> = _AbstractFunctor_<A> & {
  map<U extends ArrayType>(f: (value: A) => U): _ArrayFunctor_<U>

  flatMap<U extends ArrayType>(f: (value: A) => _ArrayFunctor_<U>): _ArrayFunctor_<U>
}
