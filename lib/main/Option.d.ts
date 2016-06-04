import { Iterable } from "./Iterable";
import { List } from "./List";
export declare abstract class Option<A> implements Iterable<A> {
    protected value: A;
    abstract isEmpty(): boolean;
    size: number;
    constructor(value: A);
    count(p: (x: A) => boolean): number;
    forEach(f: (a: A) => void): void;
    drop(n: number): List<A>;
    dropRight(n: number): List<A>;
    dropWhile(p: (a: A) => boolean): List<A>;
    filter(p: (a: A) => boolean): Option<A>;
    filterNot(p: (a: A) => boolean): Option<A>;
    foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B;
    foldRight<B>(z: B): (op: (a: A, b: B) => B) => B;
    map(f: (object: A) => any): Some<any>;
    get: A;
    getOrElse(defaultValue: A): A;
    head(): A;
    headOption(): Option<A>;
    toArray(): A[];
    abstract toList(): List<A>;
}
export declare class Some<A> extends Option<A> {
    constructor(value: A);
    isEmpty(): boolean;
    get: A;
    size: number;
    toList(): List<A>;
}
export declare class None<A> extends Option<A> {
    constructor();
    isEmpty(): boolean;
    get: A;
    size: number;
    toList(): List<A>;
}
export declare const none: None<any>;
export declare function option<T>(x: T): Option<T>;
export declare function some<T>(x: T): Some<T>;
