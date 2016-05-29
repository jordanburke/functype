import { Iterable } from "./Iterable";
import { List } from "./List";
import { Option } from "./Option";
export declare class IMap<K, V> implements Iterable<[K, V]> {
    private data;
    constructor(data: Iterable<[K, V]>);
    count(p: (tuple: [K, V]) => boolean): number;
    drop(n: number): IMap<K, V>;
    dropRight(n: number): IMap<K, V>;
    dropWhile(p: (a: [K, V]) => boolean): IMap<K, V>;
    filter(p: (a: [K, V]) => boolean): IMap<K, V>;
    filterNot(p: (a: [K, V]) => boolean): IMap<K, V>;
    forEach(f: (a: [K, V]) => void): void;
    get(key: K): Option<V>;
    getOrElse(key: K, defaultValue: V): V;
    head(): [K, V];
    headOption(): Option<[K, V]>;
    iterator: Iterable<[K, V]>;
    set(entry: [K, V]): IMap<K, V>;
    map<K1, V1>(f: (a: [K, V]) => [K1, V1]): IMap<K1, V1>;
    toArray(): [K, V][];
    toList(): List<[K, V]>;
    toString(): string;
}
export declare function iMap<K, V>(iterable: Iterable<[K, V]>): IMap<K, V>;
