// Basic structures....?

import {PersistentBinaryUnionFind} from './pbuf.js';
import {Cell, Grid, Halfedge} from './grid.js';
import {show} from './node.js';

function assert<T>(arg: T): NonNullable<T> {
  if (arg == null) throw new Error(`Expected non-null: ${arg}`);
  return arg!;
}

type SlitherlinkConstraint = readonly [
  y: number,
  x: number,
  count: number,
];

export class Slitherlink {
  constructor(
    readonly grid: Grid,
    readonly uf: PersistentBinaryUnionFind,
    readonly constraints: ReadonlyMap<number, number>,
    private readonly cellMap: ReadonlyMap<number, number>) {}

  static create(h: number, w: number, ...constraints: SlitherlinkConstraint[]): Slitherlink {
    const grid = new Grid(h, w);
    const cellMap = new Map<number, number>();
    for (const cell of grid.cells) {
      cellMap.set(cell.y << 16 | cell.x, cell.index);
    }

    const uf = PersistentBinaryUnionFind.create(grid.cells.length);

    const constraintMap =
        new Map(constraints.map(
            ([y, x, count]) => [assert(cellMap.get(y << 16 | x)), count]));
    return new Slitherlink(grid, uf, constraintMap, cellMap);
  }

  private update(uf: PersistentBinaryUnionFind) {
    if (uf === this.uf) return this;
    if ((this as any).EXPECT_FROZEN) throw new Error();
    return new Slitherlink(this.grid, uf, this.constraints, this.cellMap);
  }

  // NOTE: this is done automatically by rangeCheck
  zeros(): Slitherlink {
    let uf = this.uf;
    for (const [i, count] of this.constraints) {
      if (count) continue;
      const c = this.grid.cells[i];
      for (const h of c.incident) {
        uf = uf.union(c.index, h.twin.cell.index);
      }
    }
    return this.update(uf);
  }

  rangeCheck1(): Slitherlink {
    let uf = this.uf;
    for (const [i, count] of this.constraints) {
      const cell = this.grid.cells[i];
      const [min, max] = this.range(cell);
      if (min === max) continue;
      let f: ((x: number) => number) | undefined = undefined;
      if (min === count) f = x => x;
      if (max === count) f = x => ~x;
      if (!f) continue;
      const color = pos(uf.find(i));
      // all the remaining edges are x's
      for (const h of cell.incident) {
        if (pos(uf.find(h.twin.cell.index)) === color) continue;
try{
        uf = uf.union(h.twin.cell.index, f(i));
}catch(err){
console.error(`${cell.y},${cell.x}: count=${count}, min=${min}, max=${max} => ${h.twin.cell.y},${h.twin.cell.x}`);
throw err;
}
        if ((this as any).EXPECT_FROZEN && uf !== this.uf){const uf1=String(this.uf);const uf2=String(uf); throw new Error(`mutated on ${h.twin.cell.index}, ${f(i)}\n${uf1}\n  => [${uf1 === uf2}]  \n${uf2}`);}
      }
    }
    return this.update(uf);
  }

  // variation on rangeCheck that doesn't need to know current cell
  // at all, and could possibly infer current cell from neighbors?
  //  - TODO - can we generalize rangeCheck out of this?
  rangeCheck2(): Slitherlink {
    let uf = this.uf;
    OUTER:
    for (const [i, count] of this.constraints) {
      const cell = this.grid.cells[i];
      const neighbors = new Map<number, [number, number]>();
      const cellColor = pos(uf.find(cell.index));
      let eligible = false;
      for (const h of cell.incident) {
        const color = uf.find(h.twin.cell.index);
        const pcolor = pos(color);
        if (cellColor === pos(color)) continue OUTER;
        if (neighbors.has(pcolor)) {
          eligible = true;
        } else {
          neighbors.set(pcolor, [0, 0]);
        }
        neighbors.get(pcolor)![color < 0 ? 0 : 1]++;
      }
      if (!eligible) continue;
      // at this point we know one neighbor color is duplicated
      // see if we break the range assumption by making the central
      // cell one or the other.  also see if we can set the non-duplicated
      // ones as the same or opposite each other, or something else relative
      // to the duplicated ones.  What if 5 neighbors, a a b b c?

      const [min, max] = this.range(cell);
      if (min === max) continue;
      let f: ((x: number) => number) | undefined = undefined;
      if (min === count) f = x => x;
      if (max === count) f = x => ~x;
      if (!f) continue;
      const color = pos(uf.find(i));
      // all the remaining edges are x's
      for (const h of cell.incident) {
        if (pos(uf.find(h.twin.cell.index)) === color) continue;
        uf = uf.union(h.twin.cell.index, f(i));
      }
    }
    return this.update(uf);
  }

  rangeCheck(): Slitherlink {
    let uf = this.uf;
    for (const [i, count] of this.constraints) {
      uf = this.rangeCheckCell(this.grid.cells[i], count, uf);
    }
    return this.update(uf);
  }

  rangeCheckCell(cell: Cell, count: number, uf: PersistentBinaryUnionFind): PersistentBinaryUnionFind {
    // Basic plan: we have 5 cells: the center and the 4 neighbors.
    // Figure out if _any_ are shared.

    let color = uf.find(cell.index);
    let f = (x: number) => x;
    if (color < 0) {
      color = ~color;
      f = x => ~x;
    }
    let colors = [color];
    const bitIndex = new Map<number, number>([[color, 0]]);
    const neighbors = cell.incident.map(h => {
      const c = f(uf.find(h.twin.cell.index));
      const p = pos(c);
      let bit = bitIndex.get(p);
      if (bit == undefined) {
        bitIndex.set(p, bit = bitIndex.size);
        colors.push(p);
      }
      return c < 0 ? ~bit : bit;
    });
    if (count && bitIndex.size === cell.incident.length + 1) return uf; // nothing to do
    // Otherwise, try all combinations and see what sticks
console.log(`Cell ${cell.y},${cell.x} (${count}): colors=${colors.join(',')} neighbors=${neighbors.join(',')}`);
    const ok =
        Array.from({length: 1 << bitIndex.size - 1}, (_, i) => i).filter(i => {
          i <<= 1; // WLOG the zero bit can always be unset
          let walls = 0;
          for (const n of neighbors) {
            walls += (n < 0 ? (~i >>> ~n) & 1 : (i >>> n) & 1);
          }
console.log(`  ${i.toString(2).padStart(colors.length,'0')}: ${walls}`);
          return walls === count;
        });
console.log(`  OK:           ${ok.map(i=>i.toString(2).padStart(colors.length-1,'0')+'0').join(',')}`);
    // Find bits or PAIRS of bits that are always FALSE.
    // Say we have bits 0, 1, 2
    // Then we have 4 results.  Consider the following examples:
    //             A      B      C      D      E
    //   00  =>  true   false  true   true   false
    //   01  =>  false  true   false  true   true
    //   10  =>  true   false  false  true   true
    //   11  =>  false  false  true   false  false
    // A: bit 1 needs to be 0, so we union colors[0],colors[1].
    // B: bit 1 needs to be 1 and bit 2 needs to be 0 so we union
    //    colors[0],~colors[1] and colors[0],colors[2]
    // C: bit 1 needs to be the same as bit 2, so union colors[1],colors[2]
    // D: cannot draw any conclusion
    // E: bit 1 needs to be different from bit 2, so union colors[1],~colors[2]
    //
    // To figure all this out, we collect the row indices that are true
    // and we OR them all together.  Any zero bits must be the
    // same as ~colors[0].  We OR their complements: any zero bits are the
    // same as colors[0].  Then for each bit index b, we map the `ok` array
    // with (x => (x & (1 << b) ? x : ~x) >> (b + 1)) and the opposite
    // (? ~x : x) and OR these together as well.
    const all = (1 << (colors.length - 1)) - 1;
    for (let b = 0; b < colors.length - 1; b++) {
      for (let s = 0; s < 2; s++) {
        let mask = 0;
const terms = [];
        for (const i of ok) {
          const flipped = b && (i & (1 << (b - 1))) ? i : ~i;
terms.push(((s ? flipped : ~flipped) & all));
          mask |= ((s ? flipped : ~flipped) /*& all*/) >>> b;
        }
console.log(`  bit ${b} sign ${s}: ${terms.map(x=>x.toString(2).padStart(colors.length-1,'0')+'0').join(',')} => ${((mask&(all>>>b))).toString(2).padStart(colors.length-1-b,'0')}`);
        // any zero bits correspond to facts!
        for (let b2 = b + 1; b2 < colors.length; b2++) {
          if (!(mask & 1)) {
//            console.log(`Cell ${cell.y},${cell.x} (${count}): colors=${colors.join(',')} neighbors=${neighbors.join(',')} ok=${ok.map(x => x.toString(2).padStart(colors.length-1,'0')+'0').join(',')} union ${b} ${s?'':'~'}${b2}`);
            console.log(`    => union ${b}(${colors[b]}) ${s?'~':''}${b2}(${s?~colors[b2]:colors[b2]})`);
            uf = uf.union(colors[b], s ? ~colors[b2] : colors[b2]);
            break; // if there's another one, it'll get picked up next iteration
          }
          mask >>>= 1;
        }
      }
    }

console.log(`${show(this.update(uf))}\n${uf}\n`);

    return uf;
  }

  vertexCheck(): Slitherlink {
    let s: Slitherlink = this;
    for (const v of this.grid.vertices) {
      let walls = 0;
      let unknowns = [];
      for (const h of v.incoming) {
        const e = this.edgeType(h);
        if (e === true) walls++;
        if (e == undefined) unknowns.push(h);
      }
      let fill: boolean|undefined = undefined;
      if (walls === 2) {
        fill = false;
      } else if (walls == 1 && unknowns.length === 1) {
        fill = true;
      }
      if (fill != undefined) {
        for (const h of unknowns) {
          s = s.setEdgeType(h, fill);
        }
      }
    }
    return s;
  }

  // TODO - if a 1 has two same-neighbors then we know its color
  // similarly, if a 3 has two same-neighbors (incl edge)
  // if a 2 has two known neighbors, we know something about the others
  //   - this will prob require a more sophisticated range check that
  //     recognizes that (c|a,a,~a,b) cannot be 0 and can only be 3 if b=a
  //     or can only be 2 if b=~a
  // two neighboring 3s get lines along, two kitty-corner 3s get opposing lines
  
  edgeType(h: Halfedge): boolean|undefined {
    const c1 = this.uf.find(h.cell.index);
    const c2 = this.uf.find(h.twin.cell.index);
    return c1 === c2 ? false : c1 === ~c2 ? true : undefined;
  }
  setEdgeType(h: Halfedge, wall: boolean): Slitherlink {
    return this.update(this.uf.union(
      h.cell.index,
      wall ? ~h.twin.cell.index : h.twin.cell.index));
  }

  // returns the (inclusive) range of possible edge numbers given neighbors
  range(cell: Cell): [number, number] {
    const counts = new DebtSet<number>();
    let minWalls = 0;
    const center = this.uf.find(cell.index);
    for (const h of cell.incident) {
      const n = h.twin.cell;
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
    const v = this.data.get(elem) || 0;
    if (v === -count) {
      this.data.delete(elem);
    } else {
      this.data.set(elem, v + count);
    } 
  }
  [Symbol.iterator]() {
    return this.data[Symbol.iterator]();
  }
}


function pos(arg: number): number {
  return arg < 0 ? ~arg : arg;
}

// // Basically a unionfind-like algorithm
// class ColorMap {
//   private readonly data: ReadonlyMap<number, number>;
//   constructor(data: ReadonlyMap<number, number> = new Map()) {
//     this.data = data;
//   }

//   // persistent/readonly
//   set(orginal: number, target: number): ColorMap {
//     // TODO - ... simplify?
//     return new ColorMap(new Map([...this], [original, target]));
//   }

// }


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
