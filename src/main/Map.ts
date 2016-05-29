import {Iterable, IterableImpl} from "./Iterable";
import {list, List} from "./List";
import {option, Option} from "./Option";
import {Array as ES6Array, Map as ES6Map} from "es6-shim";
Array = ES6Array;

export class IMap<K,V> implements Iterable<[K,V]> {

  private data : Map<K,V>;

  constructor(data : Iterable<[K,V]>) {
    this.data = new Map<K,V>();
    if (data) {
      data.forEach((pair : [K,V]) => {
        this.data.set(pair[0], pair[1]);
      });
    }
  }

  public count(p: (tuple : [K,V]) => boolean) : number {
    return new IMapIterator(this.data.entries()).count(p);
  }

  public forEach(f: (a : [K,V]) => void) {
    return new IMapIterator(this.data.entries()).forEach(f);
  }

  public drop(n : number) : IMap<K,V> {
    let count = 0;
    const newMap = new Map<K,V>();
    new IMapIterator(this.data.entries()).forEach((pair : [K,V]) => {
       if (count >= n) {
         newMap.set(pair[0], pair[1]);
       }
    });
    return new IMap<K,V>(new IMapIterator(this.data.entries()));
  }

  public dropRight(n : number) : IMap<K,V> {
    let count = this.data.size - n;
    const newMap = new Map<K,V>();
    new IMapIterator(this.data.entries()).forEach((pair : [K,V]) => {
      if (count < n) {
        newMap.set(pair[0], pair[1]);
      }
    });
    return new IMap<K,V>(new IMapIterator(this.data.entries()));
  }

  public dropWhile(p: (a: [K,V]) => boolean) : IMap<K,V> {
    let count = -1;
    new IMapIterator(this.data.entries()).forEach((pair : [K,V]) => {
      if (p(pair)) {
        count++;
      }
    });
    return this.drop(count);
  }

  public filter(p: (a: [K,V]) => boolean) : IMap<K,V> {
    const newInternalMap = new Map<K,V>();
    new IMapIterator(this.data.entries()).forEach((pair : [K,V]) => {
      if (p(pair)) {
        newInternalMap.set(pair[0], pair[1]);
      }
    });
    return new IMap<K,V>(new IMapIterator(newInternalMap.entries()));
  }

  public filterNot(p: (a: [K,V]) => boolean) : IMap<K,V> {
    const newInternalMap = new Map<K,V>();
    new IMapIterator(this.data.entries()).forEach((pair : [K,V]) => {
      if (!p(pair)) {
        newInternalMap.set(pair[0], pair[1]);
      }
    });
    return new IMap<K,V>(new IMapIterator(newInternalMap.entries()));
  }

  public get(key: K) : Option<V> {
    return option(this.data.get(key));
  }

  public getOrElse(key: K, defaultValue: V) : V {
    return option(this.data.get(key)).getOrElse(defaultValue);
  }

  public head() : [K,V] {
    return this.data.entries().next().value;
  }

  public headOption() : Option<[K,V]> {
    return option(this.data.entries().next().value);
  }

  public get iterator(): IterableImpl<[K,V]> {
    return new IMapIterator(this.data.entries());
  }

  public set(entry: [K,V]) : IMap<K,V> {
    return iMap(list<[K,V]>([entry]));
  }

  public map<K1, V1>(f : (a : [K,V]) => [K1,V1]) : IMap<K1, V1> {
    const newInternalMap = new Map<K1,V1>();
    new IMapIterator(this.data.entries()).forEach((pair : [K,V]) => {
      const newValue = f(pair);
      newInternalMap.set(newValue[0], newValue[1]);
    });
    return new IMap<K1,V1>(new IMapIterator<[K1,V1]>(newInternalMap.entries()));
  }

  public toArray() : [K,V][]  {
    return this.toList().toArray();
  }

  public toList() : List<[K,V]> {
    return list(this.iterator);
  }

  public toString() : string {
    const rawString = this.toArray().map((entry : [K,V]) => `${entry[0]} -> ${entry[1]} `).join(', ');
    return `Map(${rawString})`;
  }
}

export function iMap<K,V>(iterable : Iterable<[K,V]>) : IMap<K,V> {
  return new IMap<K,V>(iterable);
}

class IMapIterator<A> extends IterableImpl<A> {
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
