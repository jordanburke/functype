/**
 * Created by Jordan on 4/23/2016.
 */

export class Option<T> {

  public isEmpty: boolean;
  public size: number;

  constructor(protected value: T) {
  }

  public map(f: (object: T) => any) {
    return new Some(f(this.value));
  }

  public get get() {
    return this.value;
  }

  public getOrElse(defaultValue: T): T {
    return this.value ? this.value : defaultValue;
  }

}

export class Some<T> extends Option<T> {

  constructor(value: T) {
    super(value);
  }

  public get isEmpty() {
    return true;
  };

  public get get() {
    return this.value;
  }

  public get size(): number {
    return 1;
  }
}

export class None<T> extends Option<T> {

  constructor(none: T = null) {
    super(none);
  }

  public get isEmpty() {
    return true;
  }

  public get get(): T {
    throw new Error('None.get');
  }

  public get size(): number {
    return 0;
  }
}

export function option<T>(x: T): Option<T> {
  return x ? some(x) : none;
}

export function some<T>(x: T): Some<T> {
  return new Some(x);
}

export const none: None<any> = new None();
