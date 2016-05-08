import { Iterable } from "./Iterable";
export declare class IMap<K, V> implements Iterable<[K, V]> {
    private data;
    constructor(iterable: Iterable<[K, V]>);
    count(p: (tuple: [K, V]) => boolean): number;
    forEach(f: (a: [K, V]) => void): void;
    drop(n: number): IMap<K, V>;
    dropRight(n: number): IMap<K, V>;
    filter(p: (a: [K, V]) => boolean): IMap<K, V>;
    filterNot(p: (a: [K, V]) => boolean): IMap<K, V>;
}
export declare function iMap<K, V>(iterable: Iterable<[K, V]>): IMap<K, V>;
