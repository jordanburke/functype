import { Option, IOption } from './Option';
import { IList } from './List';
export interface Iterable<A> {
    count(p: (x: A) => boolean): number;
    find(p: (a: A) => boolean): IOption<A>;
    forEach(f: (a: A) => void): any;
    drop(n: number): Iterable<A>;
    dropRight(n: number): Iterable<A>;
    dropWhile(p: (a: A) => boolean): Iterable<A>;
    exists(p: (a: A) => boolean): Boolean;
    filter(p: (a: A) => boolean): Iterable<A>;
    filterNot(p: (a: A) => boolean): Iterable<A>;
    foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B;
    foldRight<B>(z: B): (op: (a: A, b: B) => B) => B;
    head(): A;
    headOption(): IOption<A>;
    isEmpty(): boolean;
    map<B>(f: (a: A) => B): Iterable<B>;
    size(): number;
    toArray(): A[];
    toList(): IList<A>;
}
export declare abstract class IterableImpl<A> implements Iterable<A> {
    private _iterator;
    private _data;
    constructor(iterator: Iterator<A>, data?: Iterable<A>);
    count(p: (x: A) => Boolean): number;
    exists(p: (a: A) => boolean): Boolean;
    find(p: (a: A) => boolean): IOption<A>;
    forEach(f: (a: A) => void): void;
    foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B;
    foldRight<B>(z: B): (op: (a: A, b: B) => B) => B;
    head(): A;
    headOption(): Option<A>;
    isEmpty(): boolean;
    iterator(): Iterable<A>;
    drop(n: number): Iterable<A>;
    dropRight(n: number): Iterable<A>;
    dropWhile(p: (a: A) => boolean): Iterable<A>;
    filter(p: (a: A) => boolean): Iterable<A>;
    filterNot(p: (a: A) => boolean): Iterable<A>;
    map<B>(f: (a: A) => B): Iterable<B>;
    size(): number;
    toArray(): A[];
    toList(): IList<A>;
}
