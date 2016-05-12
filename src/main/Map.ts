import {Iterable, IterableImpl} from "./Iterable";
import {list, List} from "./List";
import {option, Option} from "./Option";
import {Array as ES6Array, Map} from "es6-shim";
Array = ES6Array;

export class IMap<K,V> implements Iterable<[K,V]> {

  private data : Map<K,V>;

  constructor(iterable : Iterable<[K,V]>) {
    this.data = new Map<K,V>();
    if (iterable) {
      iterable.forEach((pair : [K,V]) => {
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

  public filter(p: (a: [K,V]) => boolean) : IMap<K,V> {
    const newMap = new Map<K,V>();
    new IMapIterator(this.data.entries()).forEach((pair : [K,V]) => {
      if (p(pair)) {
        newMap.set(pair[0], pair[1]);
      }
    });
    return new IMap<K,V>(new IMapIterator(this.data.entries()));
  }

  public filterNot(p: (a: [K,V]) => boolean) : IMap<K,V> {
    const newMap = new Map<K,V>();
    new IMapIterator(this.data.entries()).forEach((pair : [K,V]) => {
      if (!p(pair)) {
        newMap.set(pair[0], pair[1]);
      }
    });
    return new IMap<K,V>(new IMapIterator(this.data.entries()));
  }

  public get(key: K) : Option<V> {
    return option(this.data.get(key));
  }

  public getOrElse(key: K, defaultValue: V) : V {
    return option(this.data.get(key)).getOrElse(defaultValue);
  }

  public get head() : [K,V] {
    return this.data.entries().next().value;
  }

  public get headOption() : Option<[K,V]> {
    return option(this.data.entries().next().value);
  }

  public set(entry: [K,V]) : IMap<K,V> {
    return iMap(list<[K,V]>([entry]));
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
  filter(p: (a: A) => boolean) : Iterable<A> {
    throw new Error();
  }
  filterNot(p: (a: A) => boolean) : Iterable<A> {
    throw new Error();
  }
}
