/**
 * Created by Jordan on 4/23/2016.
 */
export declare module lang {
    class Option<T> {
        protected value: T;
        constructor(value: T);
        map(f: (object: T) => any): Some<any>;
        get(): T;
        getOrElse(defaultValue: T): T;
    }
    class Some<T> extends Option<T> {
        constructor(value: T);
        isEmpty: () => boolean;
        get(): T;
    }
    class None<T> extends Option<T> {
        constructor(none?: T);
        isEmpty: () => boolean;
        get(): T;
    }
}
export declare function Option<T>(x: T): lang.Option<T>;
export declare function Some<T>(x: T): lang.Some<T>;
export declare const None: lang.None<any>;
