import {list, List} from '../../src/main/List';
import {option, some, none, Option} from '../../src/main/Option';

describe('List Test ', () => {
  let myStringList: List<string>;
  let myNumberList: List<number>;

  beforeEach(() => {
    myStringList = list(['hello', 'you', 'wonderful', 'world!']);
    myNumberList = list([1,2,3,4,5,6,7,8,9,10]);
  });

  it('Map Should return a new List of Mapped Values of the Same Size', () => {
    const myListCounts = myStringList.map((item) => item.length);
    expect(myListCounts.get(0)).toBe(5);
    expect(myListCounts.get(1)).toBe(3);
    expect(myListCounts.get(2)).toBe(9);
    expect(myListCounts.get(3)).toBe(6);
    const oldList = <List<any>>myStringList;
    const newList = <List<any>>myListCounts;
    expect(oldList === newList).toBeFalsy();
    expect(myListCounts.length === myStringList.length).toBeTruthy();
  });

  it('Find Should return a value', () => {
    const value : Option<string> = myStringList.find((item) => { return item === 'wonderful'});
    expect(value.get).toBe('wonderful');
  });

  it('Find Should return a none', () => {
    const value : Option<string> = myStringList.find((item) => { return item === 'horrible'});
    expect(value).toBe(none);
  });

  it('Reduce Should return a Combined Value', () => {
    const value : number = myNumberList.reduce((n1, n2) => { return n1 + n2; });
    expect(value).toBe(55);
  });

  it('Union Should return a new List', () => {
    const newNumberList = list<number>([11,12,13,14,15]);
    const value : List<number> = myNumberList.union(newNumberList);
    expect(value.toArray()).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]);
    expect(myNumberList.size).toBe(10);
    expect(newNumberList.size).toBe(5);
    expect(value.size).toBe(15);
  });
});
