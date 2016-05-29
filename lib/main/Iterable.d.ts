import { Option } from "./Option";
import { List } from "./List";
export interface Iterable<A> {
    count(p: (x: A) => Boolean): number;
    forEach(f: (a: A) => void): any;
    drop(n: number): Iterable<A>;
    dropRight(n: number): Iterable<A>;
    dropWhile(p: (a: A) => boolean): Iterable<A>;
    filter(p: (a: A) => boolean): Iterable<A>;
    filterNot(p: (a: A) => boolean): Iterable<A>;
    head(): A;
    headOption(): Option<A>;
    map<B>(f: (a: A) => B): Iterable<B>;
    toList(): List<A>;
}
export declare abstract class IterableImpl<A> implements Iterable<A> {
    private _iterator;
    constructor(iterator: Iterator<A>);
    count(p: (x: A) => Boolean): number;
    forEach(f: (a: A) => void): void;
    head(): A;
    headOption(): Option<A>;
    abstract drop(n: number): Iterable<A>;
    abstract dropRight(n: number): Iterable<A>;
    abstract dropWhile(p: (a: A) => boolean): Iterable<A>;
    abstract filter(p: (a: A) => boolean): Iterable<A>;
    abstract filterNot(p: (a: A) => boolean): Iterable<A>;
    abstract map<B>(f: (a: A) => B): Iterable<B>;
    abstract toList(): List<A>;
}
