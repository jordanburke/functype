import {option, Option} from "./Option"
import {list, List} from "./List"

export interface Iterable<A> {
  count(p : (x : A) => boolean) : number
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
  private _data : Iterable<A>;

  constructor(iterator : Iterator<A>, data ?: Iterable<A>) {
    this._iterator = iterator;
    this._data = data;
  }

  public count(p : (x : A) => Boolean) : number {
    let count = 0;
    for (let i = this._iterator.next(); !i.done; i = this._iterator.next()) {
      const result = p(i.value);
      count = result ? count + 1 : count;
    }
    return count;
  }

  public forEach(f: (a : A) => void) {
    for (let i = this._iterator.next(); !i.done; i = this._iterator.next()) {
      f(i.value);
    }
  }

  public head(): A {
    return this._iterator.next().value;
  }

  public headOption(): Option<A> {
    return option(this.head());
  }
  
  public iterator(): Iterable<A> {
    return this;
  }

  public drop(n : number) : Iterable<A> {
    return this._data.drop(n);
  }

  public dropRight(n : number) : Iterable<A> {
    return this._data.dropRight(n);
  }

  public dropWhile(p: (a: A) => boolean) : Iterable<A> {
    return this._data.dropWhile(p);
  }
  
  public filter(p: (a: A) => boolean) : Iterable<A> {
    return this._data.filter(p);
  }
  
  public filterNot(p: (a: A) => boolean) : Iterable<A> {
    return this._data.filterNot(p);
  }

  public map<B>(f : (a : A) => B) : Iterable<B> {
    return this._data.map(f);
  }

  public toList() : List<A> {
    return this._data.toList();
  }
}
