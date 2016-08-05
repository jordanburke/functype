import {Iterable, IterableImpl} from './Iterable';
import {IList, List} from './List';

export interface IOption<A> extends Iterable<A> {

  get : A;

}

export abstract class Option<A> implements IOption<A> {

  public abstract isEmpty(): boolean;

  constructor(protected value: A) {
  }

  public count(p : (x : A) => boolean) : number {
    return this.toList().count(p);
  }

  public drop(n : number) : Iterable<A> {
    return this.toList().drop(n);
  }

  public dropRight(n : number) : Iterable<A> {
    return this.toList().dropRight(n);
  }

  public dropWhile(p: (a: A) => boolean) : Iterable<A> {
    return this.toList().dropWhile(p);
  }

  public exists(p: (a: A) => boolean): boolean {
    return !this.find(p).isEmpty();
  }

  public find(p: (a: A) => boolean): IOption<A> {
    return p(this.get) ? this : none;
  }

  public forEach(f: (a : A) => void) {
    f(this.value);
  }

  public filter(p: (a: A) => boolean) : Option<A> {
    return p(this.value) ? this : new None<A>();
  }

  public filterNot(p: (a: A) => boolean) : Option<A> {
    return !p(this.value) ? this : new None<A>();
  }

  public foldLeft<B>(z: B): (op: (b : B, a : A) => B) => B {
    return this.toList().foldLeft(z);
  }

  public foldRight<B>(z: B): (op: (a : A, b : B) => B) => B {
    return this.toList().foldRight(z);
  }

  public abstract map<B>(f: (object: A) => B) : Option<B>;

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

  public abstract size() : number;

  public toArray() : A[] {
    return this.toList().toArray();
  }

  public abstract toList() : IList<A>
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

  public map<B>(f: (object: A) => B) : Option<B> {
    return new Some(f(this.value));
  }

  public size(): number {
    return 1;
  }

  public toList() : IList<A> {
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

  public map<B>(f: (object: A) => B) : Option<B> {
    return none;
  }

  public size(): number {
    return 0;
  }

  public toList() : IList<A> {
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
