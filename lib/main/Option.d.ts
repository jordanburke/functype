import { Iterable } from './Iterable';
import { IList } from './List';
export interface IOption<A> extends Iterable<A> {
    get: A;
}
export declare abstract class Option<A> implements IOption<A> {
    protected value: A;
    abstract isEmpty(): boolean;
    constructor(value: A);
    count(p: (x: A) => boolean): number;
    find(p: (a: A) => boolean): IOption<A>;
    forEach(f: (a: A) => void): void;
    drop(n: number): Iterable<A>;
    dropRight(n: number): Iterable<A>;
    dropWhile(p: (a: A) => boolean): Iterable<A>;
    filter(p: (a: A) => boolean): Option<A>;
    filterNot(p: (a: A) => boolean): Option<A>;
    foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B;
    foldRight<B>(z: B): (op: (a: A, b: B) => B) => B;
    abstract map<B>(f: (object: A) => B): Option<B>;
    get: A;
    getOrElse(defaultValue: A): A;
    head(): A;
    headOption(): Option<A>;
    abstract size(): number;
    toArray(): A[];
    abstract toList(): IList<A>;
}
export declare class Some<A> extends Option<A> {
    constructor(value: A);
    isEmpty(): boolean;
    get: A;
    map<B>(f: (object: A) => B): Option<B>;
    size(): number;
    toList(): IList<A>;
}
export declare class None<A> extends Option<A> {
    constructor();
    isEmpty(): boolean;
    get: A;
    map<B>(f: (object: A) => B): Option<B>;
    size(): number;
    toList(): IList<A>;
}
export declare const none: None<any>;
export declare function option<T>(x: T): Option<T>;
export declare function some<T>(x: T): Some<T>;
