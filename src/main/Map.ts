import {Iterable, IterableImpl} from './Iterable';
import {list, List, IList} from './List';
import {option, Option, IOption} from './Option';
import {Array as ES6Array, Map as ES6Map} from 'es6-shim';
Array = ES6Array;

export class IMap<K,V> implements Iterable<[K,V]> {

  private _mapData : Map<K,V>;

  constructor(data : Iterable<[K,V]>) {
    this._mapData = new Map<K,V>();
    if (data) {
      data.forEach((pair : [K,V]) => {
        this._mapData.set(pair[0], pair[1]);
      });
    }
  }

  public count(p: (tuple : [K,V]) => boolean) : number {
    return new IMapIterator(this._mapData.entries()).count(p);
  }

  public drop(n : number) : IMap<K,V> {
    let count = 0;
    const newMap = new Map<K,V>();
    new IMapIterator(this._mapData.entries()).forEach((pair : [K,V]) => {
       if (count >= n) {
         newMap.set(pair[0], pair[1]);
       }
    });
    return new IMap<K,V>(new IMapIterator(this._mapData.entries()));
  }

  public dropRight(n : number) : IMap<K,V> {
    let count = this._mapData.size - n;
    const newMap = new Map<K,V>();
    new IMapIterator(this._mapData.entries()).forEach((pair : [K,V]) => {
      if (count < n) {
        newMap.set(pair[0], pair[1]);
      }
    });
    return new IMap<K,V>(new IMapIterator(this._mapData.entries()));
  }

  public dropWhile(p: (a: [K,V]) => boolean) : IMap<K,V> {
    let count = -1;
    new IMapIterator(this._mapData.entries()).forEach((pair : [K,V]) => {
      if (p(pair)) {
        count++;
      }
    });
    return this.drop(count);
  }

  public exists(p: (a: [K,V]) => boolean): boolean {
    return !this.find(p).isEmpty();
  }

  public filter(p: (a: [K,V]) => boolean) : IMap<K,V> {
    const newInternalMap = new Map<K,V>();
    new IMapIterator(this._mapData.entries()).forEach((pair : [K,V]) => {
      if (p(pair)) {
        newInternalMap.set(pair[0], pair[1]);
      }
    });
    return new IMap<K,V>(new IMapIterator(newInternalMap.entries()));
  }

  public filterNot(p: (a: [K,V]) => boolean) : IMap<K,V> {
    const newInternalMap = new Map<K,V>();
    new IMapIterator(this._mapData.entries()).forEach((pair : [K,V]) => {
      if (!p(pair)) {
        newInternalMap.set(pair[0], pair[1]);
      }
    });
    return new IMap<K,V>(new IMapIterator(newInternalMap.entries()));
  }

  public find(p: (a: [K,V]) => boolean) : IOption<[K,V]> {
    return this.toList().find(p);
  }

  public foldLeft<B>(z: B): (op: (b : B, a : [K,V]) => B) => B {
    return this.toList().foldLeft(z);
  }

  public foldRight<B>(z: B): (op: (a : [K,V], b : B) => B) => B {
    return this.toList().foldRight(z);
  }

  public forEach(f: (a : [K,V]) => void) {
    return new IMapIterator(this._mapData.entries()).forEach(f);
  }

  public get(key: K) : Option<V> {
    return option(this._mapData.get(key));
  }

  public getOrElse(key: K, defaultValue: V) : V {
    return option(this._mapData.get(key)).getOrElse(defaultValue);
  }

  public head() : [K,V] {
    return this._mapData.entries().next().value;
  }

  public headOption() : Option<[K,V]> {
    return option(this._mapData.entries().next().value);
  }

  public isEmpty() : boolean {
    return this.size() === 0;
  }

  public iterator(): Iterable<[K,V]> {
    return new IMapIterator(this._mapData.entries());
  }

  public set(entry: [K,V] | K, value ?: V) : IMap<K,V> {
    if (entry) {
      if (entry instanceof Array) {
        return iMap(list<[K,V]>([entry]));
      } else if (entry && value) {
        return iMap(list<[K,V]>([[entry, value]]));
      }
    } else {
      throw Error('Invalid set ' + entry);
    }
  }

  public map<K1, V1>(f : (a : [K,V]) => [K1,V1]) : IMap<K1, V1> {
    const newInternalMap = new Map<K1,V1>();
    new IMapIterator(this._mapData.entries()).forEach((pair : [K,V]) => {
      const newValue = f(pair);
      newInternalMap.set(newValue[0], newValue[1]);
    });
    return new IMap<K1,V1>(new IMapIterator<[K1,V1]>(newInternalMap.entries()));
  }

  public size() : number {
    return this._mapData.size;
  }

  public toArray() : [K,V][]  {
    return this.toList().toArray();
  }

  public toList() : IList<[K,V]> {
    return list<[K,V]>(this.iterator());
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
