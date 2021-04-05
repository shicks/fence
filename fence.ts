// Basic structures....?

import {PersistentBinaryUnionFind} from './pbuf.js';

// Example 4x4 grid:
//   0   1  2  3  4
//     +-------------+
//   5 |  6  7  8  9 |
//  10 | 11 12 13 14 |
//  15 | 16 17 18 19 |
//  20 | 21 22 23 24 |
//     +-------------+
//  25   26 27 28 29
// We map 0..4, 26..29, and 5N to 0 immediatey.

class Grid {
  constructor(readonly h: number, readonly w: number) {}

  isValid(i: number): boolean {
    const dy = this.w + 1;
    if (i < dy) return false;
    if (!(i % dy)) return false;
    if (i > dy * (this.h + 1)) return false;
    return true;
  }

  neighbors(i: number): number[] {
    const dy = this.w + 1;
    return [i - dy, i + 1, i + dy, i - 1];
  }

  x(index: number): number {
    return (index % (this.w + 1)) - 1;
  }

  y(index: number): number {
    return Math.floor(index / (this.w + 1));
  }

  index(y: number, x: number): number {
    return (y + 1) * (this.w + 1) + x + 1;
  }

  initialize(): PersistentBinaryUnionFind {
    let uf = PersistentBinaryUnionFind.create((h + 2) * (w + 1));
    for (let i = 1; i <= w; i++) {
      uf = uf.union(0, i).union(0, (h + 1) * (w + 1) + i);
    }
    for (let i = 1; i <= h + 1; i++) {
      uf = uf.union(0, i * (w + 1));
    }
    return uf;
  }
}

class Slitherlink {
  grid: Grid;
  uf: PersistentBinaryUnionFind;
  constraints = new Map<number, number>();

  constructor(h: number, w: number) {
    this.grid = new Grid(h, w);
    this.uf = this.grid.initialize();
  }

  addConstraint(y: number, x: number, edges: number): void {
    this.constraints.set(this.grid.index(y, x), edges);
  }

  // returns the (inclusive) range of possible edge numbers given neighbors
  range(y: number, x: number): [number, number] {
    const index = this.grid.index(y, x);
    const counts = new DebtSet<number>();
    let minWalls = 0;
    const center = this.uf.find(index);
    for (const n of this.grid.neighbors(index)) {
      const nv = this.uf.find(n);
      if (nv === ~center) {
        minWalls++;
      } else if (nv !== center) {
        counts.add(nv < 0 ? ~nv : nv, nv < 0 ? -1 : 1);
      }
    }
    let maxWalls = minWalls;
    for (const [, count] of counts) {
      maxWalls += Math.abs(count);
    }
    return [minWalls, maxWalls];
  }

  // TODO - how to satisfy a constraint?
  //   - e.g. cell 30 has constraint 2 and neighbors [0, ~0, ~30, 24]
  //   - range should be [2, 3] since we're guaranteed one wall by 0 or ~0
  //     and one more by ~30; the 24 is unknown.
  //   - possible option: given a cell, try various options (neighbors and
  //     their complement) and look for a contradiction?

}

class DebtSet<T> {
  private data = new Map<T, number>();
  add(elem: T, count = 1) {
    const v = data.get(elem);
    if (v === -count) {
      data.delete(elem);
    } else {
      data.set(elem, v + count);
    } 
  }
  [Symbol.iterator]() {
    return this.data[Symbol.iterator]();
  }
}


// Basically a unionfind-like algorithm
class ColorMap {
  private readonly data: ReadonlyMap<number, number>;
  constructor(data: ReadonlyMap<number, number> = new Map()) {
    this.data = data;
  }

  // persistent/readonly
  set(orginal: number, target: number): ColorMap {
    // TODO - ... simplify?
    return new ColorMap(new Map([...this], [original, target]));
  }

}


class Grid {
  constructor(readonly h: number, readonly w: number) {}
}


class Cell {
  constructor(readonly g: Grid, readonly y: number, readonly x: number) {}

  // neighbors, etc
}
