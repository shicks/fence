// Basic structures....?

import {PersistentBinaryUnionFind} from './pbuf.js';
import {Grid, Cell, Vertex, Halfedge, Edge} from './grid.js';

class Slitherlink {
  grid: Grid;
  uf: PersistentBinaryUnionFind;
  constraints = new Map<number, number>();
  cellMap = new Map<number, number>();

  constructor(h: number, w: number) {
    this.grid = new Grid(h, w);
    for (const cell of this.grid.cells) {
      this.cellMap.set(cell.y << 16 | cell.x, cell.index);
    }
    this.uf = this.grid.initialize();
  }

  addConstraint(y: number, x: number, edges: number): void {
    this.constraints.set(this.cellMap.get(y << 16 | x), edges);
  }

  // returns the (inclusive) range of possible edge numbers given neighbors
  range(y: number, x: number): [number, number] {
    const cell = this.grid.cells[this.cellMap.get(y << 16 | x).index];
    const counts = new DebtSet<number>();
    let minWalls = 0;
    const center = this.uf.find(cell.index);
    for (const h of cell.incident) {
      const n = h.twin.facet;
      const nv = this.uf.find(n.index);
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

// This is a multiset where elements can go negative.
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


// class Vertex {
//   readonly edges!: readonly Halfedge[];
//   constructor(readonly y: number, readonly x: number, readonly id: number) {}
//   toString(): string { return `v${this.y},${this.x}`; }
// }

// class Halfedge {
//   readonly edge: number; // ID of edge, shared by both twins
//   readonly twin!: Halfedge;
//   readonly next!: Halfedge;
//   readonly prev!: Halfedge;
//   readonly vert!: Vertex;
//   readonly cell!: Cell;
//   constructor(readonly y: number, readonly x: number, readonly dir: boolean) {}
//   toString(): string { return `h${this.y},${this.x},${this.dir}`; }
// }

// class Cell {
//   readonly outside?: boolean;
//   readonly edges!: readonly Halfedge[];
//   constructor(readonly y: number, readonly x: number, readonly id: number) {}
//   toString(): string { return `c${this.y},${this.x}`; }
// }

// class Grid {
//   constructor(readonly h: number, readonly w: number) {
//     const outside = new Cell(0, 0, 0);
//     const edges = new Map<string, Halfedge>();
//     const cells = new Map<string, Cell>();
//     const verts = new Map<string, Vertex>();
    


//   }
// }

// class Vertex {
  
// }

// class Halfedge {
//   readonly vertex: Vertex;
//   readonly cell?: Cell;
//   readonly next: Halfedge;
//   readonly prev: Halfedge;
//   readonly twin: Halfedge;
// }

// class Cell {
//   constructor(readonly g: Grid, readonly y: number, readonly x: number) {


//   }

//   // neighbors, etc
// }
