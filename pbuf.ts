// Persistent binary union-find algorithm.
// A slight modification of puf.ts based on an assumption
// that the final state is a binary partition: all indices
// will map to either 0 or ~0.  We introduce negative indices
// to represent the complement set, and ensure that 0 and ~0
// are always considered canonical by giving them infinite rank

import {PArray} from './parray.js';

export class PersistentBinaryUnionFind {
  static create(size: number): PersistentBinaryUnionFind {
    return new PersistentBinaryUnionFind(PArray.create(size, i => i),
                                         PArray.create(size, () => 0).set(0, Infinity));
  }
  private constructor(private readonly parent: PArray<number>,
                      private rank: PArray<number>) {}
  find(index: number): number {
    const find = new Find(this.parent, index);
    find.find();
    this.parent = find.parent;
    return find.inv ? ~find.index : find.index;
  }
  union(x: number, y: number): PersistentBinaryUnionFind {
    const cx = this.find(x);
    const cy = this.find(y);
    if (cx === cy) return this;
    if (cx === ~cy) throw new Error(`Cannot union inverses: ${x} (${cx}) and ${y} (${cy})`);
    const rx = this.rank.get(cx < 0 ? ~cx : cx);
    const ry = this.rank.get(cy < 0 ? ~cy : cy);
    if (rx > ry) {
      return new PersistentBinaryUnionFind(this.parent.set(cy, cx), this.rank);
    } else if (rx < ry) {
      return new PersistentBinaryUnionFind(this.parent.set(cx, cy), this.rank);
    }
    return new PersistentBinaryUnionFind(this.parent.set(cy, cx),
                                         this.rank.set(cx, rx + 1));
  }
}

class Find {
  inv: boolean;
  index: number;
  constructor(public parent: PArray<number>, index: number) {
    this.inv = index < 0;
    this.index = this.inv ? ~index : index;
  }
  find() {
    const i = this.index;
    const fi = this.parent.get(i);
    if (fi === i) return; // NOTE: we should never have (i => ~i)
    const inv = fi < 0;
    if (inv) {
      this.inv = !this.inv;
      this.index = ~fi;
    } else {
      this.index = fi;
    }
    this.find();
    this.parent = this.parent.set(i, inv ? ~this.index : this.index);
  }
}
