export interface Iterable<A> {
    count(p: (x: A) => Boolean): number;
    forEach(f: (a: A) => void): any;
    drop(n: number): Iterable<A>;
    dropRight(n: number): Iterable<A>;
    filter(p: (a: A) => boolean): Iterable<A>;
    filterNot(p: (a: A) => boolean): Iterable<A>;
}
export declare abstract class IterableImpl<A> implements Iterable<A> {
    private iterator;
    constructor(iterator: Iterator<A>);
    count(p: (x: A) => Boolean): number;
    forEach(f: (a: A) => void): void;
    abstract drop(n: number): Iterable<A>;
    abstract dropRight(n: number): Iterable<A>;
    abstract filter(p: (a: A) => boolean): Iterable<A>;
    abstract filterNot(p: (a: A) => boolean): Iterable<A>;
}
