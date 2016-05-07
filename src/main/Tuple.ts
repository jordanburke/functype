
export interface Tuple<T1,T2,T3> {
  _1 : T1;
  _2 ?: T2;
  _3 ?: T3;
}


export class Tuple1<T1,T2,T3> implements Tuple<T1,T2,T3> {
  constructor(public _1:T1) {
  }
}

export class Tuple2<T1,T2,T3> implements Tuple<T1,T2,T3>  {
  constructor(public _1:T1,
              public _2:T2) {
  }
}

export class Tuple3<T1, T2, T3> implements Tuple<T1,T2,T3> {
  constructor(public _1:T1,
              public _2:T2,
              public _3:T3) {
  }
}

export function tuple<T1,T2,T3>(_1 : T1, 
                           _2 : T2 = null, 
                           _3 : T3 = null) : Tuple<T1,T2,T3> {
  if (_1 && _2) {
    return new Tuple2(_1, _2);
  }
  return new Tuple1(_1);
}
