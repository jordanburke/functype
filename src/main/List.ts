import {iMap, IMap} from './Map';
import {Iterable, IterableImpl} from './Iterable';
import {option, Option, IOption} from './Option';
import {Array as ES6Array} from 'es6-shim';
Array = ES6Array;

export interface IList<A> extends Iterable<A> {

  length: number;

  contains(elem: A) : boolean;

  _(index :number);

  get(index : number) : A;

  map<B>(f : (a : A) => B) : IList<B>;

  reduce<A1 extends A>(op: (x : A1, y : A1) => A1) : A;

  reverse() : IList<A>;

  union(that: A[] | IList<A>) : IList<A>;

}

/**
 * An Immutable List class in similar to a Scala List. It's important to point out that this list is not infact a real
 * Linked List in the traditional sense, instead it is backed by a AypeScript/JavaScript Array for simplicity and
 * performance reasons (i.e., arrays are heavily optimized by VMs) so unless there's a good reason to impliement a
 * traditional List this will remain this way. Externally the List Interface will ensure immutabliy by returning new
 * instances of the List and will not mutate the List or the underlying Array in any way.
 */
export class List<A> implements IList<A> {

  private _listData : A[];

  constructor(args: A[] | Iterable<A>) {
    if (args instanceof ES6Array) {
      this._listData = args.concat([]);
    } else {
      this._listData = [];
      args.forEach((item) => {
        this._listData.push(item);
      });
    }
  }

  public contains(elem: A) : boolean {
    return this._listData.indexOf(elem) > -1;
  }

  public count(p: (a : A) => boolean) : number {
    return this._listData.filter(p).length;
  }

  public drop(n : number) : IList<A> {
    return list<A>(this._listData.slice(n));
  }

  public dropRight(n : number) : IList<A> {
    return list<A>(this._listData.slice(0, n));
  }

  public dropWhile(p: (a: A) => boolean) : IList<A> {
    throw new Error('dropWhile');
  }

  public exists(p: (a: A) => boolean): Boolean {
    return !this.find(p).isEmpty();
  }

  public filter(p: (a: A) => boolean) : IList<A> {
    return list<A>(this._listData.filter(p));
  }

  public filterNot(p: (a: A) => boolean) : IList<A> {
    const inverse = (a: A) => {
      return !p(a);
    };
    return list<A>(this._listData.filter(inverse));
  }

  public find(p: (a: A) => boolean) : IOption<A> {
    return option(this._listData.find(p));
  }

  public foldLeft<B>(z: B): (op: (b : B, a : A) => B) => B {
    let accumulator : B = z;
    return (op: (b : B, a : A) => B) => {
      this.forEach((item : A) => {
        accumulator = op(accumulator, item);
      });
      return accumulator;
    };
  }

  public foldRight<B>(z: B): (op: (a : A, b : B) => B) => B {
    const reversedList = this.reverse();
    let accumulator : B = z;
    // Couldn't get delegate call to foldLeft here, TypeScript compiler issue? or bad syntax?
    return (op: (a : A, b : B) => B) => {
      reversedList.forEach((item : A) => {
        accumulator = op(item, accumulator);
      });
      return accumulator;
    };
  }

  public forEach(f: (a : A) => void) {
    [].concat(this._listData).forEach(f);
  }

  public _(index :number) : A {
    return this.get(index);
  }

  public get(index : number) : A {
    return this._listData[index];
  }

  public head(): A {
    return this._listData[0];
  }

  public headOption(): IOption<A> {
    return option(this.head());
  }

  public isEmpty() : boolean {
    return this.size() === 0;
  }

  public iterator() : Iterable<A> {
    return new ListIterator(this._listData.values(), this);
  }

  public map<B>(f : (a : A) => B) : IList<B> {
    const newArray : B[] = this._listData.map(f);
    return list(newArray);
  }

  public get length() {
    return this._listData.length;
  }

  public reduce<A1 extends A>(op: (x : A1, y : A1) => A1) : A {
    return this._listData.reduce(op);
  }

  public reverse() : IList<A> {
    return new List([].concat(this._listData).reverse());
  }

  public size() : number {
    return this.length;
  }

  public toArray() : A[] {
    return [].concat(this._listData);
  }

  public toList() : IList<A> {
    return list(this._listData);
  }

  public toString() : string {
    const rawString = this._listData.join(', ');
    return `List(${rawString})`;
  }

  public union(that: A[] | IList<A>) : IList<A> {
    if (that instanceof List) {
      return list<A>(this._listData.concat(that.toArray()));
    } else if (that instanceof Array){
      return list<A>(this._listData.concat(...that));
    } else {
      throw 'Unsupported Type ' + typeof that;
    }
  }
}

export function list<A>(args: A[] | Iterable<A>) : List<A> {
  return new List<A>(args);
}

class ListIterator<A> extends IterableImpl<A> {

}
