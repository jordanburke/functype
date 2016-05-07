import {Iterable, IterableImpl} from "./Iterable";
import {option, Option} from "./Option";
import {Array as ES6Array, Map} from "es6-shim";
Array = ES6Array;

export class IMap<K,V> implements Iterable<[K,V]> {

  private data : Map<K,V>;

  constructor() {
    this.data = new Map<K,V>();
  }

  public count(p: (tuple : [K,V]) => boolean) : number {
    return new IterableImpl(this.data.entries()).count(p);
  }
}
