export interface Iterable<A> {
    count(p: (x: A) => Boolean): any;
}
export declare class IterableImpl<A> implements Iterable<A> {
    private iterator;
    constructor(iterator: Iterator<A>);
    count(p: (x: A) => Boolean): number;
}
