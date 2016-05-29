import { Iterable } from "./Iterable";
import { Option } from "./Option";
/**
 * An Immutable List class in similar to a Scala List. It's important to point out that this list is not infact a real
 * Linked List in the traditional sense, instead it is backed by a AypeScript/JavaScript Array for simplicity and
 * performance reasons (i.e., arrays are heavily optimized by VMs) so unless there's a good reason to impliement a
 * traditional List this will remain this way. Externally the List Interface will ensure immutabliy by returning new
 * instances of the List and will not mutate the List or the underlying Array in any way.
 */
export declare class List<A> implements Iterable<A> {
    private data;
    constructor(args: A[] | Iterable<A>);
    contains(elem: A): boolean;
    count(p: (a: A) => boolean): number;
    forEach(f: (a: A) => void): void;
    drop(n: number): List<A>;
    dropRight(n: number): List<A>;
    dropWhile(p: (a: A) => boolean): List<A>;
    filter(p: (a: A) => boolean): List<A>;
    filterNot(p: (a: A) => boolean): List<A>;
    find(p: (a: A) => boolean): Option<A>;
    _(index: number): A;
    get(index: number): A;
    head(): A;
    headOption(): Option<A>;
    map<B>(f: (a: A) => B): List<B>;
    length: number;
    reduce<A1 extends A>(op: (x: A1, y: A1) => A1): A;
    size: number;
    toArray(): A[];
    toList(): List<A>;
    toString(): string;
    union(that: A[] | List<A>): List<A>;
}
export declare function list<A>(args: A[] | Iterable<A>): List<A>;
