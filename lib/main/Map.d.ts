import { Iterable } from "./Iterable";
export declare class IMap<K, V> implements Iterable<[K, V]> {
    private data;
    constructor();
    count(p: (tuple: [K, V]) => boolean): number;
}
