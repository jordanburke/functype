import { Option } from "./Option";
import { List } from "./List";
export interface Iterable<A> {
    count(p: (x: A) => boolean): number;
    forEach(f: (a: A) => void): any;
    drop(n: number): Iterable<A>;
    dropRight(n: number): Iterable<A>;
    dropWhile(p: (a: A) => boolean): Iterable<A>;
    filter(p: (a: A) => boolean): Iterable<A>;
    filterNot(p: (a: A) => boolean): Iterable<A>;
    foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B;
    foldRight<B>(z: B): (op: (a: A, b: B) => B) => B;
    head(): A;
    headOption(): Option<A>;
    map<B>(f: (a: A) => B): Iterable<B>;
    toArray(): A[];
    toList(): List<A>;
}
export declare abstract class IterableImpl<A> implements Iterable<A> {
    private _iterator;
    private _data;
    constructor(iterator: Iterator<A>, data?: Iterable<A>);
    count(p: (x: A) => Boolean): number;
    forEach(f: (a: A) => void): void;
    foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B;
    foldRight<B>(z: B): (op: (a: A, b: B) => B) => B;
    head(): A;
    headOption(): Option<A>;
    iterator(): Iterable<A>;
    drop(n: number): Iterable<A>;
    dropRight(n: number): Iterable<A>;
    dropWhile(p: (a: A) => boolean): Iterable<A>;
    filter(p: (a: A) => boolean): Iterable<A>;
    filterNot(p: (a: A) => boolean): Iterable<A>;
    map<B>(f: (a: A) => B): Iterable<B>;
    toArray(): A[];
    toList(): List<A>;
}
