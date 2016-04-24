/**
 * Created by jordanburke on 4/24/16.
 */
export declare class List<T> {
    private data;
    constructor(args: T[]);
    forEach(f: (a: T) => void): void;
    map<B>(f: (a: T) => B): List<B>;
}
export declare function list<T>(args: T[]): List<T>;
