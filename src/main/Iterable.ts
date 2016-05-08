import {option, Option} from "./Option"

export interface Iterable<A> {
  count(p : (x : A) => Boolean) : number
  forEach(f: (a : A) => void)
  drop(n : number) : Iterable<A>
  dropRight(n : number) : Iterable<A>
  filter(p: (a: A) => boolean) : Iterable<A>
  filterNot(p: (a: A) => boolean) : Iterable<A>
}

export abstract class IterableImpl<A> implements Iterable<A> {

  private iterator : Iterator<A>;

  constructor(iterator : Iterator<A>) {
    this.iterator = iterator;
  }

  public count(p : (x : A) => Boolean) : number {
    let count = 0;
    for (let i = this.iterator.next(); !i.done; i = this.iterator.next()) {
      const result = p(i.value);
      count = result ? count + 1 : count;
    }
    return count;
  }

  forEach(f: (a : A) => void) {
    for (let i = this.iterator.next(); !i.done; i = this.iterator.next()) {
      f(i.value);
    }
  }

  abstract drop(n : number) : Iterable<A>
  abstract dropRight(n : number) : Iterable<A>
  abstract filter(p: (a: A) => boolean) : Iterable<A>
  abstract filterNot(p: (a: A) => boolean) : Iterable<A>
}
