// Persistent union-find algorithm.
// See http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.79.8494

import {PArray} from './parray.js';

export class PersistentUnionFind {
  static create(size: number): PersistentUnionFind {
    return new PersistentUnionFind(PArray.create(size, i => i),
                                   PArray.create(size, () => 0));
  }
  private constructor(private readonly parent: PArray<number>,
                      private rank: PArray<number>) {}
  find(index: number): number {
    const find = new Find(this.parent, index);
    find.find();
    this.parent = find.parent;
    return find.index;
  }
  union(x: number, y: number): PersistentUnionFind {
    const cx = this.find(x);
    const cy = this.find(y);
    if (cx === cy) return this;
    const rx = this.rank.get(cx);
    const ry = this.rank.get(cy);
    if (rx > ry) {
      return new PersistentUnionFind(this.parent.set(cy, cx), this.rank);
    } else if (rx < ry) {
      return new PersistentUnionFind(this.parent.set(cx, cy), this.rank);
    }
    return new PersistentUnionFind(this.parent.set(cy, cx),
                                   this.rank.set(cx, rx + 1));
  }
}

class Find {
  constructor(public parent: PArray<number>, public index: number) {}
  find() {
    const i = this.index;
    const fi = this.parent.get(i);
    if (fi === i) return;
    this.index = fi;
    this.find();
    this.parent = this.parent.set(i, this.index);
  }
}
