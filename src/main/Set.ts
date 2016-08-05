import {Iterable, IterableImpl} from './Iterable';
import {list, List} from './List';
import {option, Option, IOption} from './Option';
import {Array as ES6Array} from 'es6-shim';
Array = ES6Array;


export class ISet<A> implements Iterable<A> {

  private data : Set<A>;

  constructor(data : Iterable<A>) {
    this.data = new Set<A>();
    if (data) {
      data.forEach((value : A) => {
        this.data.add(value);
      });
    }
  }

  public count(p: (tuple : A) => boolean) : number {
    return new ISetIterator(this.data.keys()).count(p);
  }

  public drop(n : number) : ISet<A> {
    let count = 0;
    const newSet = new Set<A>();
    new ISetIterator(this.data.keys()).forEach((value : A) => {
      if (count >= n) {
        newSet.add(value);
      }
    });
    return new ISet<A>(new ISetIterator(this.data.keys()));
  }

  public dropRight(n : number) : ISet<A> {
    let count = this.data.size - n;
    const newSet = new Set<A>();
    new ISetIterator(this.data.keys()).forEach((value : A) => {
      if (count < n) {
        newSet.add(value);
      }
    });
    return new ISet<A>(new ISetIterator(this.data.keys()));
  }

  public dropWhile(p: (a: A) => boolean) : ISet<A> {
    let count = -1;
    new ISetIterator(this.data.keys()).forEach((pair : A) => {
      if (p(pair)) {
        count++;
      }
    });
    return this.drop(count);
  }

  public filter(p: (a: A) => boolean) : ISet<A> {
    const newInternalSet = new Set<A>();
    new ISetIterator(this.data.keys()).forEach((value : A) => {
      if (p(value)) {
        newInternalSet.add(value);
      }
    });
    return new ISet<A>(new ISetIterator(newInternalSet.keys()));
  }

  public filterNot(p: (a: A) => boolean) : ISet<A> {
    const newInternalSet = new Set<A>();
    new ISetIterator(this.data.keys()).forEach((value : A) => {
      if (!p(value)) {
        newInternalSet.add(value);
      }
    });
    return new ISet<A>(new ISetIterator(newInternalSet.keys()));
  }

  find(p: (a: A) => boolean): IOption<A> {
    return this.toList().find(p);
  }

  public foldLeft<B>(z: B): (op: (b : B, a : A) => B) => B {
    return this.toList().foldLeft(z);
  }

  public foldRight<B>(z: B): (op: (a : A, b : B) => B) => B {
    return this.toList().foldRight(z);
  }

  public forEach(f: (a : A) => void) {
    return new ISetIterator(this.data.keys()).forEach(f);
  }

  public head() : A {
    return this.data.keys().next().value;
  }

  public headOption() : IOption<A> {
    return option(this.data.keys().next().value);
  }

  public isEmpty() : boolean {
    return this.size() === 0;
  }

  public iterator(): Iterable<A> {
    return new ISetIterator(this.data.keys());
  }

  public add(value: A) : ISet<A> {
    if (value) {
      if (value instanceof Object) {
        return iSet(list<A>([value]));
      }
    } else {
      return this; // This correct as it's not a new instance
    }
  }

  public map<B>(f : (a : A) => B) : ISet<B> {
    const newInternalSet = new Set<B>();
    new ISetIterator(this.data.keys()).forEach((pair : A) => {
      const newValue = f(pair);
      newInternalSet.add(newValue);
    });
    return new ISet<B>(new ISetIterator<B>(newInternalSet.keys()));
  }

  public size() : number {
    return this.data.size;
  }

  public toArray() : A[]  {
    return this.toList().toArray();
  }

  public toList() : List<A> {
    return list<A>(this.iterator());
  }

  public toString() : string {
    const rawString = this.toArray().map((value : A) => `${value}`).join(', ');
    return `Set(${rawString})`;
  }
}

export function iSet<A>(iterable : Iterable<A>) : ISet<A> {
  return new ISet<A>(iterable);
}

class ISetIterator<A> extends IterableImpl<A> {

  drop(n : number) : Iterable<A> {
    throw new Error();
  }
  dropRight(n : number) : Iterable<A> {
    throw new Error();
  }
  dropWhile(p: (a: A) => boolean) : Iterable<A> {
    throw new Error();
  }
  filter(p: (a: A) => boolean) : Iterable<A> {
    throw new Error();
  }
  filterNot(p: (a: A) => boolean) : Iterable<A> {
    throw new Error();
  }
  map<B>(f : (a : A) => B) : Iterable<B> {
    throw new Error();
  }
  toList() : List<A> {
    throw new Error();
  }
}
