export interface Tuple<T1, T2, T3> {
    _1: T1;
    _2?: T2;
    _3?: T3;
}
export declare class Tuple1<T1, T2, T3> implements Tuple<T1, T2, T3> {
    _1: T1;
    constructor(_1: T1);
}
export declare class Tuple2<T1, T2, T3> implements Tuple<T1, T2, T3> {
    _1: T1;
    _2: T2;
    constructor(_1: T1, _2: T2);
}
export declare class Tuple3<T1, T2, T3> implements Tuple<T1, T2, T3> {
    _1: T1;
    _2: T2;
    _3: T3;
    constructor(_1: T1, _2: T2, _3: T3);
}
export declare function tuple<T1, T2, T3>(_1: T1, _2?: T2, _3?: T3): Tuple<T1, T2, T3>;
