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
  private constructor(private parent: PArray<number>,
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
    // Versions that guarantee the key is positive (we can invert both safely).
    const xx = cx < 0 ? ~cx : cx;
    const xy = cx < 0 ? ~cy : cy;
    const yx = cy < 0 ? ~cx : cx;
    const yy = cy < 0 ? ~cy : cy;
    const rx = this.rank.get(xx);
    const ry = this.rank.get(yy);
if((PersistentBinaryUnionFind as any).EXPECT_FROZEN) throw new Error(`${x} => ${cx} (${rx}); ${y} => ${cy} (${ry})`);
    if (rx > ry) {
console.log(`union1 ${x} ${y}: ${yy} -> ${yx}`);
      return new PersistentBinaryUnionFind(this.parent.set(yy, yx), this.rank);
    } else if (rx < ry) {
console.log(`union2 ${x} ${y}: ${xx} -> ${xy}`);
      return new PersistentBinaryUnionFind(this.parent.set(xx, xy), this.rank);
    }
    const a= new PersistentBinaryUnionFind(this.parent.set(yy, yx),
                                         this.rank.set(xx, rx + 1));
console.log(`union3 ${x} ${y}: ${yy} -> ${yx} +rank ${xx}\n${a}`);return a;
  }
  toString(): string {
    const parts = [];
    for (let i = 0; i < this.parent.length; i++) {
      if (i !== this.parent.get(i) || this.rank.get(i)) parts.push(`${i}: ${this.parent.get(i)} (${this.rank.get(i)})`);
    }
    return parts.join(', ');
  }
}

class Find {
d='      ';
  inv: boolean;
  index: number;
  constructor(public parent: PArray<number>, index: number) {
    this.inv = index < 0;
    this.index = this.inv ? ~index : index;
  }
  find() {
    const inv0 = this.inv;
    const i = this.index;
    /*const*/let fi = this.parent.get(i);
    if (fi === i) return; // NOTE: we should never have (i => ~i)
console.log(`${this.d}find ${inv0?'~':''}${this.index} => ${fi}`);
if(this.index===55&&fi===47)console.dir(this.parent);
    // const inv = fi < 0;
    // if (inv) {
    //   this.inv = !this.inv;
    //   this.index = ~fi;
    // } else {
    //   this.index = fi;
    // }
    if (this.inv) {this.inv = false; fi = ~fi;}
    if (fi<0) {this.index = ~fi; this.inv = !this.inv;} else {this.index=fi;}

this.d+=' ';
    this.find();
this.d=this.d.substring(1);
//if(this.parent.get(i)!==(inv?~this.index:this.index))
console.log(`${this.d} ${i} -> ${inv0?'~':''}${this.index}`);
    this.parent = this.parent.set(i, (inv0!==this.inv) ? ~this.index : this.index);
  }
}
