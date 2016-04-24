/**
 * Created by jordanburke on 4/24/16.
 */

export class List<T> {

  private data : T[];

  constructor(args: T[]) {
    this.data = args;
  }

  public forEach(f: (a : T) => void) {
    this.data.forEach(f);
  }

  public get(index : number) : T {
    return this.data[index];
  }

  public map<B>(f : (a : T) => B) : List<B> {
    const newArray : B[] = this.data.map(f);
    return new List(newArray);
  }

  public get length() {
    return this.data.length;
  }

  public get size() {
    return this.length;
  }
}

export function list<T>(args: T[]) : List<T> {
  return new List(args);
}
