import {list, List} from '../../src/main/List';

describe('Wish Test ', () => {
  let myList: List<string>;

  beforeEach(() => {
    myList = list(['hello', 'you', 'wonderful', 'world!']);
  });
  it('Map Should return a new List of Mapped Values of the Same Size', () => {
    const myListCounts = myList.map((item) => item.length);
    expect(myListCounts.get(0)).toBe(5);
    expect(myListCounts.get(1)).toBe(3);
    expect(myListCounts.get(2)).toBe(9);
    expect(myListCounts.get(3)).toBe(6);
    const oldList = <List<any>>myList;
    const newList = <List<any>>myListCounts;
    expect(oldList === newList).toBeFalsy();
    expect(myListCounts.length === myList.length).toBeTruthy();
  });
});
