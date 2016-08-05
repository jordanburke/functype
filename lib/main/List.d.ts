import { Iterable } from './Iterable';
import { IOption } from './Option';
export interface IList<A> extends Iterable<A> {
    length: number;
    _(index: number): any;
    get(index: number): A;
    map<B>(f: (a: A) => B): IList<B>;
    reduce<A1 extends A>(op: (x: A1, y: A1) => A1): A;
    reverse(): IList<A>;
    union(that: A[] | IList<A>): IList<A>;
}
/**
 * An Immutable List class in similar to a Scala List. It's important to point out that this list is not infact a real
 * Linked List in the traditional sense, instead it is backed by a AypeScript/JavaScript Array for simplicity and
 * performance reasons (i.e., arrays are heavily optimized by VMs) so unless there's a good reason to impliement a
 * traditional List this will remain this way. Externally the List Interface will ensure immutabliy by returning new
 * instances of the List and will not mutate the List or the underlying Array in any way.
 */
export declare class List<A> implements IList<A> {
    private data;
    constructor(args: A[] | Iterable<A>);
    contains(elem: A): boolean;
    count(p: (a: A) => boolean): number;
    forEach(f: (a: A) => void): void;
    drop(n: number): IList<A>;
    dropRight(n: number): IList<A>;
    dropWhile(p: (a: A) => boolean): IList<A>;
    filter(p: (a: A) => boolean): IList<A>;
    filterNot(p: (a: A) => boolean): IList<A>;
    find(p: (a: A) => boolean): IOption<A>;
    foldLeft<B>(z: B): (op: (b: B, a: A) => B) => B;
    foldRight<B>(z: B): (op: (a: A, b: B) => B) => B;
    _(index: number): A;
    get(index: number): A;
    head(): A;
    headOption(): IOption<A>;
    isEmpty(): boolean;
    iterator(): Iterable<A>;
    map<B>(f: (a: A) => B): IList<B>;
    length: number;
    reduce<A1 extends A>(op: (x: A1, y: A1) => A1): A;
    reverse(): IList<A>;
    size(): number;
    toArray(): A[];
    toList(): IList<A>;
    toString(): string;
    union(that: A[] | IList<A>): IList<A>;
}
export declare function list<A>(args: A[] | Iterable<A>): List<A>;
