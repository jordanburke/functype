import {list, List, IList} from '../../src/main/List';
import {iSet, ISet} from '../../src/main/Set';
import {option, some, none, Option, IOption} from '../../src/main/Option';

describe('Set Test', () => {
  let myStringSet: ISet<string>;
  let myNumberSet: ISet<number>;

  beforeEach(() => {
    myStringSet = iSet(['hello', 'you', 'wonderful', 'world!', 'world', 'you', 'hello', 'awesome!']);
    myNumberSet = iSet([1,2,3,4,5,6,7,8,9,10,1,3,5,7,9,11]);
  });

  it('contains', () => {
    const value : boolean = myStringSet.contains('you');
    expect(value).toBeTruthy();
    const value2 : boolean = myStringSet.contains('there');
    expect(value2).toBeFalsy();
    const value3 : boolean = myStringSet.contains('awesome!');
    expect(value3).toBeTruthy();
  });

  it('count', () => {
    const value : number = myStringSet.count((x : String) => x.startsWith('w'));
    expect(value).toBe(3);

    const value2 : number = myStringSet.count((x : String) => x.startsWith('y'));
    expect(value2).toBe(1);
  });

  /*it('map', () => {
    const myListCounts : IList<number> = myStringSet.map((item) => item.length);
    expect(myListCounts.get(0)).toBe(5);
    expect(myListCounts.get(1)).toBe(3);
    expect(myListCounts.get(2)).toBe(9);
    expect(myListCounts.get(3)).toBe(6);
    const oldList = <List<any>>myStringSet;
    const newList = <List<any>>myListCounts;
    expect(oldList === newList).toBeFalsy();
    expect(myListCounts.size() === myStringSet.length).toBeTruthy();
  });*/

  it('find', () => {
    const value : IOption<string> = myStringSet.find((item) => { return item === 'wonderful'; });
    expect(value.get).toBe('wonderful');

    const value2 : IOption<string> = myStringSet.find((item) => { return item === 'horrible'; });
    expect(value2).toBe(none);

    const value3 : IOption<string> = myStringSet.find((item) => { return item === 'awesome!'; });
    expect(value3.get).toBe('awesome!');
  });

  it('foldLeft', () => {
    const folder : (op: (b : number, a : string) => number) => number = myStringSet.foldLeft<number>(10);
    const total = folder((b, a) => {
      return b + a.length;
    });
    expect(total).toBe(46);
  });

  it('foldRight', () => {
    const folder : (op: (a : string, b : number) => number) => number = myStringSet.foldRight<number>(10);
    const total = folder((a, b) => {
      return a.length + b;
    });
    expect(total).toBe(46);
  });

  /*it('reduce', () => {
    const value : number = myNumberSet.reduce((n1, n2) => { return n1 + n2; });
    expect(value).toBe(55);
  });*/

  it('toString', () => {
    expect(myStringSet.toString()).toBe('Set(hello, you, wonderful, world!, world, awesome!)');
    expect(myNumberSet.toString()).toBe('Set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)');
  });

  /*it('union', () => {
    const newNumberList = list<number>([11,12,13,14,15]);
    const value : IList<number> = myNumberSet.union(newNumberList);
    expect(value.toArray()).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
    expect(myNumberSet.size()).toBe(10);
    expect(newNumberList.size()).toBe(5);
    expect(value.size()).toBe(15);
  });*/
});
