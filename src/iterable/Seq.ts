import { none, option } from "../option"
import { _Iterable_ } from "./index"
import { _Option_ } from "../option"
import { isIterable } from "../util/isIterable"
export class Seq<A> implements _Iterable_<A> {
  protected readonly values: Iterable<A>
  constructor(values?: Iterable<A> | _Iterable_<A>) {
    if (isIterable(values)) {
      this.values = values
    } else if (values instanceof Seq) {
      this.values = values.toArray()
    } else if (!values) {
      this.values = []
    }
  }

  readonly [n: number]: A

  get length(): number {
    return this.toArray().length
  }

  map<B>(f: (a: A) => B): _Iterable_<B> {
    return new Seq(this.toArray().map(f))
  }

  flatMap<B>(f: (a: A) => _Iterable_<B>): _Iterable_<B> {
    const tempArray: B[] = []
    for (const item of this.values) {
      const mappedList = f(item)
      if (mappedList instanceof Seq) {
        tempArray.push(...mappedList.values)
      }
    }
    return new Seq(tempArray)
  }

  forEach(f: (a: A) => void) {
    this.toArray().forEach(f)
  }

  count(p: (x: A) => boolean): number {
    return 0
  }

  // drop(n: number): IIterable<A> {
  //   return undefined
  // }
  //
  // dropRight(n: number): IIterable<A> {
  //   return undefined
  // }
  //
  // dropWhile(p: (a: A) => boolean): IIterable<A> {
  //   return undefined
  // }

  exists(p: (a: A) => boolean): Boolean {
    return !this.find(p).isEmpty
  }

  filter(p: (a: A) => boolean): _Iterable_<A> {
    return new Seq<A>(this.toArray().filter(p))
  }

  filterNot(p: (a: A) => boolean): _Iterable_<A> {
    return new Seq<A>(this.toArray().filter((x) => !p(x)))
  }

  find(p: (a: A) => boolean): _Option_<A> {
    const result = this.toArray().find(p)
    return option(result)
  }

  get head(): A {
    return this.values[0]
  }

  get headOption(): _Option_<A> {
    if (this.isEmpty) {
      return option(this.head)
    } else {
      return none()
    }
  }

  get isEmpty(): boolean {
    return this.toArray().length === 0
  }

  get size(): number {
    return 0
  }

  toArray(): A[] {
    return Array.from<A>(this.values)
  }

  reduce(f: (prev: A, curr: A) => A): A {
    return this.toArray().reduce(f)
  }

  reduceRight(f: (prev: A, curr: A) => A): A {
    return this.toArray().reduceRight(f)
  }

  foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B {
    return (f: (b: B, a: A) => B) => {
      return this.toArray().reduce(f, z)
    }
  }

  foldRight<B>(z: B): (op: (a: A, b: B) => B) => B {
    return (f: (a: A, b: B) => B) => {
      return this.toArray().reduceRight((acc, value) => f(value, acc), z)
    }
  }
}
