/**
 * Created by Jordan on 4/23/2016.
 */

export module lang {
  export class Option<T> {

    constructor(protected value:T) {
    }

    public map(f:(object:T) => any) {
      return new Some(f(this.value));
    }

    public get() {
      return this.value;
    }

    public getOrElse(defaultValue:T):T {
      return this.value ? this.value : defaultValue;
    }

  }

  export class Some<T> extends Option<T> {

    constructor(value:T) {
      super(value);
    }

    public isEmpty = () => {
      return false;
    };

    public get() {
      return this.value;
    }
  }

  export class None<T> extends Option<T> {

    constructor(none:T = null) {
      super(none);
    }

    public isEmpty = () => {
      return true;
    };

    public get():T {
      throw new Error("None.get");
    }
  }
}

export function Option<T>(x:T):lang.Option<T> {
  return new lang.Option(x);
}

export function Some<T>(x:T):lang.Some<T> {
  return new lang.Some(x);
}

export const None : lang.None<any> = new lang.None();
