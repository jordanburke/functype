import {iMap, IMap} from "./Map"
import {Iterable} from "./Iterable"
import {option, Option} from "./Option"
import {Array as ES6Array} from "es6-shim"
Array = ES6Array;

/**
 * An Immutable List class in similar to a Scala List. It's important to point out that this list is not infact a real
 * Linked List in the traditional sense, instead it is backed by a AypeScript/JavaScript Array for simplicity and
 * performance reasons (i.e., arrays are heavily optimized by VMs) so unless there's a good reason to impliement a
 * traditional List this will remain this way. Externally the List Interface will ensure immutabliy by returning new
 * instances of the List and will not mutate the List or the underlying Array in any way.
 */
export class List<A> implements Iterable<A> {

  private data : A[];

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

  public drop(n : number) : List<A> {
    return list<A>(this.data.slice(n));
  }

  public dropRight(n : number) : List<A> {
    return list<A>(this.data.slice(0, n));
  }

  public dropWhile(p: (a: A) => boolean) : List<A> {
    throw new Error("dropWhile");
  }

  public filter(p: (a: A) => boolean) : List<A> {
    return list<A>(this.data.filter(p));
  }

  public filterNot(p: (a: A) => boolean) : List<A> {
    const inverse = (a: A) => {
      return !p(a);
    };
    return list<A>(this.data.filter(inverse));
  }

  public find(p: (a: A) => boolean) : Option<A> {
    return option(this.data.find(p));
  }

  public _(index :number) : A {
    return this.get(index);
  }

  public get(index : number) : A {
    return this.data[index];
  }

  head(): A {
    return this.data[0];
  }

  headOption(): Option<A> {
    return option(this.head());
  }

  public map<B>(f : (a : A) => B) : List<B> {
    const newArray : B[] = this.data.map(f);
    return list(newArray);
  }

  public get length() {
    return this.data.length;
  }

  public reduce<A1 extends A>(op: (x : A1, y : A1) => A1) {
    return this.data.reduce(op);
  }

  public get size() {
    return this.length;
  }

  public toArray() : A[] {
    return [].concat(this.data);
  }

  public toList() : List<A> {
    return list(this.data);
  }

  public toString() : string {
    const rawString = this.data.join(', ');
    return `List(${rawString})`;
  }

  public union(that: A[] | List<A>) : List<A> {
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
  return new List(args);
}
