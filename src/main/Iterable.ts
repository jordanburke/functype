import {option, Option} from "./Option"
import {list, List} from "./List"

export interface Iterable<A> {
  count(p : (x : A) => Boolean) : number
  forEach(f: (a : A) => void)
  drop(n : number) : Iterable<A>
  dropRight(n : number) : Iterable<A>
  dropWhile(p: (a: A) => boolean) : Iterable<A>
  filter(p: (a: A) => boolean) : Iterable<A>
  filterNot(p: (a: A) => boolean) : Iterable<A>
  head(): A
  headOption(): Option<A>

  map<B>(f : (a : A) => B) : Iterable<B>


  toList() : List<A>
}

export abstract class IterableImpl<A> implements Iterable<A> {

  private _iterator : Iterator<A>;

  constructor(iterator : Iterator<A>) {
    this._iterator = iterator;
  }

  public count(p : (x : A) => Boolean) : number {
    let count = 0;
    for (let i = this._iterator.next(); !i.done; i = this._iterator.next()) {
      const result = p(i.value);
      count = result ? count + 1 : count;
    }
    return count;
  }

  forEach(f: (a : A) => void) {
    for (let i = this._iterator.next(); !i.done; i = this._iterator.next()) {
      f(i.value);
    }
  }

  head(): A {
    return this._iterator.next().value;
  }
  
  headOption(): Option<A> {
    return option(this.head());
  }

  abstract drop(n : number) : Iterable<A>
  abstract dropRight(n : number) : Iterable<A>
  abstract dropWhile(p: (a: A) => boolean) : Iterable<A>
  abstract filter(p: (a: A) => boolean) : Iterable<A>
  abstract filterNot(p: (a: A) => boolean) : Iterable<A>


  abstract map<B>(f : (a : A) => B) : Iterable<B>


  abstract toList() : List<A>
}
