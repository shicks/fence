import {PArray} from '../parray';

describe('PArray', () => {
  it('should create a simple array', () => {
    const arr = PArray.create(5, x => x);
    expect([...arr]).toEqual([0, 1, 2, 3, 4]);
  });

  it('should create an empty array', () => {
    expect([...PArray.create(0, () => 0)]).toEqual([]);
  });

  it('should allow setting an element', () => {
    let arr = PArray.create(5, x => x);
    arr = arr.set(3, 6);
    expect([...arr]).toEqual([0, 1, 2, 6, 4]);
  });

  it('should persist older versions after setting an element', () => {
    let arr = PArray.create(5, x => x);
    arr.set(3, 6);
    expect([...arr]).toEqual([0, 1, 2, 3, 4]);
  });

  it('should persist newer alternate versions', () => {
    const arr = PArray.create(5, x => x);
    const arr1 = arr.set(3, 6);
    const arr2 = arr.set(3, 7);
    expect([...arr1]).toEqual([0, 1, 2, 6, 4]);
    expect([...arr2]).toEqual([0, 1, 2, 7, 4]);
  });
});
