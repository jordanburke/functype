import {option, some, none, Option, Some, None} from '../../src/main/Option';

describe('Option Test ', () => {

  beforeEach(() => {
  });

  it('option factory method should return a None on a null', () => {
    const nullOption = option(null);
    expect(nullOption).toBe(none)
  });

  it('None to be size 0', () => {
    expect(none.size()).toBe(0);
  });

  it('option factory method should return a Some on a string', () => {
    const hello = "hello";
    const someOption = option(hello);
    expect(someOption === new Some(hello)).toBeFalsy();
    expect(someOption.get === new Some(hello).get).toBeTruthy();
    expect(someOption.size()).toBe(1);
  });

});
