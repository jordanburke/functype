import {list, List, IList} from '../../src/main/List';
import {option, some, none, Option, IOption} from '../../src/main/Option';

describe('List Test ', () => {
  let myStringList: IList<string>;
  let myNumberList: IList<number>;

  beforeEach(() => {
    myStringList = list(['hello', 'you', 'wonderful', 'world!']);
    myNumberList = list([1,2,3,4,5,6,7,8,9,10]);
  });

  it('contains', () => {
    const value : boolean = myStringList.contains('wonderful');
    expect(value).toBeTruthy();
    const value2 : boolean = myStringList.contains('there');
    expect(value2).toBeFalsy();
  });

  it('count', () => {
    const value : number = myStringList.count((x : String) => x.startsWith('w'));
    expect(value).toBe(2);
  });

  it('map', () => {
    const myListCounts : IList<number> = myStringList.map((item) => item.length);
    expect(myListCounts.get(0)).toBe(5);
    expect(myListCounts.get(1)).toBe(3);
    expect(myListCounts.get(2)).toBe(9);
    expect(myListCounts.get(3)).toBe(6);
    const oldList = <List<any>>myStringList;
    const newList = <List<any>>myListCounts;
    expect(oldList === newList).toBeFalsy();
    expect(myListCounts.length === myStringList.length).toBeTruthy();
  });

  it('find', () => {
    const value : IOption<string> = myStringList.find((item) => { return item === 'wonderful'; });
    expect(value.get).toBe('wonderful');

    const value2 : IOption<string> = myStringList.find((item) => { return item === 'horrible'; });
    expect(value2).toBe(none);
  });

  it('foldLeft', () => {
    const folder : (op: (b : number, a : string) => number) => number = myStringList.foldLeft<number>(10);
    const total = folder((b, a) => {
      return b + a.length;
    });
    expect(total).toBe(33);
  });

  it('foldRight', () => {
    const folder : (op: (a : string, b : number) => number) => number = myStringList.foldRight<number>(10);
    const total = folder((a, b) => {
      return a.length + b;
    });
    expect(total).toBe(33);
  });

  it('reduce', () => {
    const value : number = myNumberList.reduce((n1, n2) => { return n1 + n2; });
    expect(value).toBe(55);
  });

  it('toString', () => {
    expect(myStringList.toString()).toBe('List(hello, you, wonderful, world!)');
    expect(myNumberList.toString()).toBe('List(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)');
  });

  it('union', () => {
    const newNumberList = list<number>([11,12,13,14,15]);
    const value : IList<number> = myNumberList.union(newNumberList);
    expect(value.toArray()).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
    expect(myNumberList.size()).toBe(10);
    expect(newNumberList.size()).toBe(5);
    expect(value.size()).toBe(15);
  });
});
