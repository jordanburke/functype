import {Iterable, IterableImpl} from "./Iterable"
import {List} from "./List"

export abstract class Option<A> implements Iterable<A> {

  public abstract isEmpty(): boolean;
  public size: number;

  constructor(protected value: A) {
  }

  public count(p : (x : A) => boolean) : number {
    return this.toList().count(p);
  }

  public forEach(f: (a : A) => void) {
    f(this.value);
  }

  public drop(n : number) : List<A> {
    return this.toList().drop(n);
  }

  public dropRight(n : number) : List<A> {
    return this.toList().dropRight(n);
  }

  public dropWhile(p: (a: A) => boolean) : List<A> {
    return this.toList().dropWhile(p);
  }

  public filter(p: (a: A) => boolean) : Option<A> {
    return p(this.value) ? this : new None<A>();
  }

  public filterNot(p: (a: A) => boolean) : Option<A> {
    return !p(this.value) ? this : new None<A>();
  }

  public map(f: (object: A) => any) {
    return new Some(f(this.value));
  }

  public get get() {
    return this.value;
  }

  public getOrElse(defaultValue: A): A {
    return this.value ? this.value : defaultValue;
  }

  public head(): A {
    return this.get;
  }

  public headOption(): Option<A> {
    return this;
  }

  public abstract toList() : List<A>
}

export class Some<A> extends Option<A> {

  constructor(value: A) {
    super(value);
  }

  public isEmpty() {
    return false;
  }

  public get get() {
    return this.value;
  }

  public get size(): number {
    return 1;
  }

  public toList() : List<A> {
    return new List([this.value]);
  }
}

export class None<A> extends Option<A> {

  constructor() {
    super(null);
  }

  public isEmpty() {
    return true;
  }

  public get get(): A {
    throw new Error('None.get');
  }

  public get size(): number {
    return 0;
  }

  public toList() : List<A> {
    return new List([]);
  }
}

export const none: None<any> = new None();

export function option<T>(x: T): Option<T> {
  return x ? some(x) : none;
}

export function some<T>(x: T): Some<T> {
  return new Some(x);
}
