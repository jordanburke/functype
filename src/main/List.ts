import {iMap, IMap} from "./Map"
import {Iterable, IterableImpl} from "./Iterable"
import {option, Option, IOption} from "./Option"
import {Array as ES6Array} from "es6-shim"
Array = ES6Array;

export interface IList<A> extends Iterable<A> {

  length: number;

  _(index :number);

  get(index : number) : A;

  map<B>(f : (a : A) => B) : IList<B>

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

  private data : A[];

  //constructor(args: A[]);
  //constructor(args: Iterable<A>)
  constructor(args: A[] | Iterable<A>) {
    if (args instanceof ES6Array) {
      this.data = args.concat([]);
    } else {
      this.data = [];
      args.forEach((item) => {
        this.data.push(item);
      });
    }
  }

  public contains(elem: A) : boolean {
    return this.data.indexOf(elem) > -1;
  }

  public count(p: (a : A) => boolean) : number {
    return this.data.filter(p).length;
  }

  public forEach(f: (a : A) => void) {
    [].concat(this.data).forEach(f);
  }

  public drop(n : number) : IList<A> {
    return list<A>(this.data.slice(n));
  }

  public dropRight(n : number) : IList<A> {
    return list<A>(this.data.slice(0, n));
  }

  public dropWhile(p: (a: A) => boolean) : IList<A> {
    throw new Error("dropWhile");
  }

  public filter(p: (a: A) => boolean) : IList<A> {
    return list<A>(this.data.filter(p));
  }

  public filterNot(p: (a: A) => boolean) : IList<A> {
    const inverse = (a: A) => {
      return !p(a);
    };
    return list<A>(this.data.filter(inverse));
  }

  public find(p: (a: A) => boolean) : IOption<A> {
    return option(this.data.find(p));
  }

  public foldLeft<B>(z: B): (op: (b : B, a : A) => B) => B {
    let accumulator : B = z;
    return (op: (b : B, a : A) => B) => {
      this.forEach((item : A) => {
        accumulator = op(accumulator, item);
      });
      return accumulator;
    }
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
    }
  }

  public _(index :number) : A {
    return this.get(index);
  }

  public get(index : number) : A {
    return this.data[index];
  }

  public head(): A {
    return this.data[0];
  }

  public headOption(): IOption<A> {
    return option(this.head());
  }

  public isEmpty() : boolean {
    return this.size() === 0;
  }

  public iterator() : Iterable<A> {
    return new ListIterator(this.data.values(), this);
  }

  public map<B>(f : (a : A) => B) : IList<B> {
    const newArray : B[] = this.data.map(f);
    return list(newArray);
  }

  public get length() {
    return this.data.length;
  }

  public reduce<A1 extends A>(op: (x : A1, y : A1) => A1) : A {
    return this.data.reduce(op);
  }

  public reverse() : IList<A> {
    return new List([].concat(this.data).reverse());
  }

  public size() : number {
    return this.length;
  }

  public toArray() : A[] {
    return [].concat(this.data);
  }

  public toList() : IList<A> {
    return list(this.data);
  }

  public toString() : string {
    const rawString = this.data.join(', ');
    return `List(${rawString})`;
  }

  public union(that: A[] | IList<A>) : IList<A> {
    if (that instanceof List) {
      return list<A>(this.data.concat(that.toArray()));
    } else if (that instanceof Array){
      return list<A>(this.data.concat(...that));
    } else {
      throw "Unsupported Type " + typeof that;
    }
  }
}

export function list<A>(args: A[] | Iterable<A>) : List<A> {
  return new List<A>(args);
}

class ListIterator<A> extends IterableImpl<A> {

}
