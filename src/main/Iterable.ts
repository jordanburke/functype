import {option, Option} from "./Option"

export interface Iterable<A> {
  count(p : (x : A) => Boolean)
}

export class IterableImpl<A> implements Iterable<A> {

  private iterator : Iterator<A>;

  constructor(iterator : Iterator<A>) {
    this.iterator = iterator;
  }

  public count(p : (x : A) => Boolean) {
    let count = 0;
    for (let i = this.iterator.next(); !i.done; i = this.iterator.next()) {
      const value = i.value;
      const result = p(value);
      count = result ? count + 1 : count;
    }
    return count;
  }

}
