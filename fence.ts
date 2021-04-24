// Basic structures....?

import {PersistentBinaryUnionFind} from './pbuf.js';
import {Cell, Grid, Halfedge} from './grid.js';
import {show} from './node.js';
import { PersistentUnionFind } from './puf.js';
import { SortedMultiset } from './sortedmultiset.js';

function assert<T>(arg: T): NonNullable<T> {
  if (arg == null) throw new Error(`Expected non-null: ${arg}`);
  return arg!;
}

type SlitherlinkConstraint = readonly [
  y: number,
  x: number,
  count: number,
];
type MasyuConstraint = readonly [
  y: number,
  x: number,
  filled?: boolean,
];
type CorralConstraint = readonly [
  y: number,
  x: number,
  value: number|boolean, // number=enclosure, T=inside/cow, F=outside/cactus
];
interface Constraints {
  slitherlink?: readonly SlitherlinkConstraint[];
  masyu?: readonly MasyuConstraint[];
  corral?: readonly CorralConstraint[];
}

interface InternalConstraint {
  readonly slitherlink: ReadonlyMap<number, number>;
  readonly masyu: ReadonlyMap<number, boolean>;
  readonly enclosure: ReadonlyMap<number, number>;
  readonly initial: ReadonlyMap<number, boolean>;
}
  
export class Fence {
  constructor(
    readonly grid: Grid,
    readonly uf: PersistentBinaryUnionFind,
    readonly c: InternalConstraint) {}

  static create(h: number, w: number, constraints: Constraints = {}): Fence {
    const grid = new Grid(h, w);
    const cellMap = new Map<number, number>();
    for (const cell of grid.cells) {
      cellMap.set(cell.y << 16 | cell.x, cell.index);
    }
    const vertMap = new Map<number, number>();
    for (const vert of grid.vertices) {
      vertMap.set(vert.y << 16 | vert.x, vert.index);
    }

    let uf = PersistentBinaryUnionFind.create(grid.cells.length);
    const c = {
      slitherlink: new Map<number, number>(),
      masyu: new Map<number, boolean>(),
      enclosure: new Map<number, number>(),
      initial: new Map<number, boolean>(),
    };
    for (const [y, x, count] of constraints.slitherlink || []) {
      c.slitherlink.set(assert(cellMap.get(y << 16 | x)), count);
    }
    for (const [y, x, filled = false] of constraints.masyu || []) {
      c.masyu.set(assert(vertMap.get(y << 16 | x)), filled);
    }
    for (const [y, x, value] of constraints.corral || []) {
      const index = assert(cellMap.get(y << 16 | x));
      if (typeof value === 'number') {
        c.enclosure.set(index, value);
      } else {
        c.initial.set(index, value);
      }
    }
    return new Fence(grid, uf, c);
  }

  private update(uf: PersistentBinaryUnionFind) {
    if (uf === this.uf) return this;
    if ((this as any).EXPECT_FROZEN) throw new Error();
    return new Fence(this.grid, uf, this.c);
  }

  isDeadEnd(cell: Cell): boolean {
    return this.c.slitherlink.get(cell.index) === cell.incident.length - 1;
  }

  // TODO - handle N-1 cells
  //  - edge with two 3's around it has only possible xs on the wings
  //  - vertex with two 3's around it has all non-incident edges x'd out
  //    and lines on all the non-incoming edges of the 3-cells
  // Is there a good way to derive this from first principles???
  handleInitialCases(): Fence {
    // Non-inner loop - just run it once at the start...
    let s: Fence = this;
    for (const [index, value] of [...this.c.initial, ...this.c.enclosure]) {
      s = s.update(s.uf.union(index, value ? ~0 : 0));
    }
    // Open circles have opposite-colored diagonals
    for (const [index, filled] of this.c.masyu) {
      if (filled) continue;
      const v = s.grid.vertices[index];
      const cells = [];
      for (const h of v.incoming) {
        for (let i = h.cell.outside ? 5 - v.incoming.length : 1; i > 0; i--) {
          cells.push(h.cell);
        }
      }
      if (cells.length !== 4) throw new Error(`Bad masyu geometry: ${cells.length}`);
      s = s.update(s.uf.union(cells[0].index, ~cells[2].index)
                       .union(cells[1].index, ~cells[3].index));
    }
    // Dead ends that share an edge get walls on all but adjacent to shared edge
    for (const edge of this.grid.edges) {
      if (edge.halfedges.every(h => this.isDeadEnd(h.cell))) {
        const unknown = new Set<Halfedge>();
        unknown.add(edge.halfedges[0].prev);
        unknown.add(edge.halfedges[0].next);
        unknown.add(edge.halfedges[1].prev);
        unknown.add(edge.halfedges[1].next);
        for (const h of edge.halfedges) {
          for (const i of h.cell.incident) {
            if (!unknown.has(i)) s = s.setEdgeType(i, true);
          }
        }
      }
    }
    // Dead ends that share a vertex get xs on all other edges that don't
    // share the dead-end cells (irrelevant for rectangular lattice) and
    // walls on the other two edges of the dead ends.
    for (const vert of this.grid.vertices) {
      if (new Set([...vert.incoming, ...vert.incoming.map(h => h.twin)]
          .flatMap(h => this.isDeadEnd(h.cell) ? [h.edge] : [])).size === 4) {
        const unknown = new Set<Halfedge>();
        for (const i of vert.incoming) {
          if (this.c.slitherlink.get(i.cell.index) === i.cell.incident.length - 1) {
            for (const h of i.cell.incident) {
              if (h.vert === vert) {
                unknown.add(h);
              } else if (h.twin.vert === vert) {
                unknown.add(h.twin);
              } else {
                s = s.setEdgeType(h, true);
              }
            }
          }
        }
        for (const i of vert.incoming) {
          if (!unknown.has(i)) s = s.setEdgeType(i, false);
        }
      }
    }
    return s;
  }

  iterate(): Fence {
    let f: Fence = this;
    f = f.masyuCheck();
    f = f.rangeCheck();
    f = f.vertexCheck();
    return f;
  }

  iterateToFixedPoint(): Fence {
    let f: Fence = this;
    let f0!: Fence;
    while (f !== f0) {
      f0 = f;
      f = f.iterate();
    }
    return f;
  }

  rangeCheck(): Fence {
    let uf = this.uf;
    for (const [i, count] of this.c.slitherlink) {
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
    const ok =
        Array.from({length: 1 << bitIndex.size - 1}, (_, i) => i).filter(i => {
          i <<= 1; // WLOG the zero bit can always be unset
          let walls = 0;
          for (const n of neighbors) {
            walls += (n < 0 ? (~i >>> ~n) & 1 : (i >>> n) & 1);
          }
          return walls === count;
        });
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
    for (let b = 0; b < colors.length - 1; b++) {
      for (let s = 0; s < 2; s++) {
        let mask = 0;
        for (const i of ok) {
          const flipped = b && (i & (1 << (b - 1))) ? i : ~i;
          mask |= ((s ? flipped : ~flipped)) >>> b;
        }
        // any zero bits correspond to facts!
        for (let b2 = b + 1; b2 < colors.length; b2++) {
          if (!(mask & 1)) {
            uf = uf.union(colors[b], s ? ~colors[b2] : colors[b2]);
            break; // if there's another one, it'll get picked up next iteration
          }
          mask >>>= 1;
        }
      }
    }
    return uf;
  }

  vertexCheck(): Fence {
    let s: Fence = this;
    for (const v of this.grid.vertices) {
      let walls = 0;
      let unknowns = [];
      for (const h of v.incoming) {
        const e = s.edgeType(h);
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

  masyuCheck(): Fence {
    let s: Fence = this;
    function isX(h: Halfedge|undefined): boolean {
      return h ? s.edgeType(h) === false : true;
    }
    function isLine(h: Halfedge|undefined): boolean {
      return !!(h && s.edgeType(h));
    }
    for (const [i, filled] of this.c.masyu) {
      const v = this.grid.vertices[i];
      // NOTE: do very different things based on filled...
      // NOTE: handling edges is a little awk
      const dirs: Halfedge[][] = [];
      for (const h of v.incoming) {
        const dir = [h];
        dirs.push(dir);
        let h2 = h.twin; // h2 points to neighbor vertex: walk around it
        let turns = 2;
        while (turns > 0) {
          turns -= h2.cell.outside ? 5 - h2.vert.incoming.length : 1;
          h2 = h2.next.twin;
        }
        if (turns === 0) {
          dir.push(h2);
        }
        if (h.cell.outside) {
          for (let i = v.incoming.length; i < 4; i++) {
            dirs.push([]);
          }
        }
      }
      if (dirs.length !== 4) throw new Error(`Bad masyu geometry: ${dirs.length}`);

      if (filled) {
        // 1. If there is an edge coming in already, then mark the
        //    opposite edge as an 'x'
        // 2. If there is an 'x' in either of the next two neighbors,
        //    or if there's an incoming perpendicular edge between them,
        //    then the opposite two must be lines
        // (TODO - can we figure the incoming perpendicular bit out more
        // naturally somehow?)
        for (let i = 0; i < 4; i++) {
          const dir = dirs[i];
          const direct = new Set(dir.map(h => h.edge));
          const sides = dir[1]?.vert.incoming.filter(h => !direct.has(h.edge));
          if (dir.length < 2 || dir.some(isX) || sides.some(isLine)) {
            s = s.setEdgeType(dirs[i ^ 2][0], true)
                 .setEdgeType(dirs[i ^ 2][1], true);
          } else if (isLine(dir[0])) {
            s = s.setEdgeType(dir[1], true);
            if (dirs[i ^ 2].length) s = s.setEdgeType(dirs[i ^ 2][0], false);
          }
        }
      } else {
        // The basic "straight through" requirement is enforced by the
        // initial constraint that diagonal cells are opposite.  But we
        // must still enforce that one side has an 'x' as a second neighbor.
        for (let i = 0; i < 4; i++) {
          // Two parallel incoming 2nd edges.
          if ((isLine(dirs[i][1]) ||
                 s.c.masyu.get(dirs[i][1]?.vert.index) === false) &&
              (isLine(dirs[i ^ 2][1]) ||
                 s.c.masyu.get(dirs[i ^ 2][1]?.vert.index) === false)) {
            s = s.setEdgeType(dirs[i][0], false);
          }
          if (isLine(dirs[i][0]) && isLine(dirs[i][1]) && dirs[i ^ 2][1]) {
            s = s.setEdgeType(dirs[i ^ 2][1], false);
          }
        }
      }
    }
    return s;
  }

  connectedCheck(): Fence {
    let s: Fence = this;
    // TODO - how to figure this out.  Seems like we want to take all the
    // colors and make domains, then build an adjacency graph of the domains.
    // Then we look for any "choke points" where removing all domains of any
    // two pairs of colors would disconnect the graph.  If any is found then
    // these colors must be opposites.
    // Can this analysis be done in parallel???  In particular, we'd like to
    // avoid being quadratic in the number of colors.
    // For now we'll just do it quadratically...
    let domainsUf = PersistentUnionFind.create(this.grid.cells.length);
    for (const e of this.grid.edges) {
      const [a, b] = e.halfedges;
      const ca = this.uf.find(a.cell.index);
      const cb = this.uf.find(b.cell.index);
      if (ca === cb) {
        domainsUf = domainsUf.union(a.cell.index, b.cell.index);
      }
    }
    const colors = new Map<number, number>();
    const colorSet = new Set<number>();
    const domainMap = new Map<number, number>();
    for (const c of this.grid.cells) {
      const cc = this.uf.find(c.index);
      const domain = domainsUf.find(c.index);
      if (!domainMap.has(domain)) domainMap.set(domain, domainMap.size);
      colors.set(domain, cc);
      colorSet.add(cc);
    }
    const graph = new Set<number>(); // elements are index1 << 16 | index2
    for (const e of this.grid.edges) {
      const [a, b] = e.halfedges;
      const da = domainsUf.find(a.index);
      const db = domainsUf.find(b.index);
      if (da === ~db) continue; // these will never be connected...
      if (da !== db) {
        graph.add(da < db ? da << 16 | db : db << 16 | da);
      }
    }
    // We now have a graph: now do a second UF based on domainsUf where
    // we union all the edges except for two colors.
    for (const ca of colorSet) {
      for (const cb of colorSet) {
        if (ca === cb || ca === ~cb) continue;
        let connected = PersistentBinaryUnionFind.create(domainMap.size);
        for (const edge of graph) {
          const a = edge >>> 16;
          const b = (edge & 0xffff);
          if (colors.get(a) === ca || colors.get(b) === ca ||
              colors.get(a) === cb || colors.get(a) === cb) {
            continue; // skip these two...
          }
          connected = connected.union(a, b);
        }
        const components = new Set<number>();
        for (let i = 0; i < domainMap.size; i++) {
          components.add(connected.find(i));
        }
        if (components.size > 2) s = s.update(this.uf.union(ca, ~cb));
      }
    }

    // TODO - this doesn't work... probably something really obvious
    // but I'm too tired to spot.  Question: rather than domains, can
    // we just use the existing PUF or PBUF to do this?

    // For each color ca,
    //   For each color cb,
    //     Trial Union ca, cb
    //       Check rules => if broken, Union ca, ~cb
    //       Check connectedness with ca removed, ensure single
    //     Trial Union ca, ~cb
    //       Same as above...
    
    return s;
  }

  slowCheck(): Fence {
    let s: Fence = this;
//console.log(`slow checks\n${show(s)}\n`);
    // TODO - how to figure this out.  Seems like we want to take all the
    // colors and make domains, then build an adjacency graph of the domains.
    // Then we look for any "choke points" where removing all domains of any
    // two pairs of colors would disconnect the graph.  If any is found then
    // these colors must be opposites.
    // Can this analysis be done in parallel???  In particular, we'd like to
    // avoid being quadratic in the number of colors.
    // For now we'll just do it quadratically...
    const colors = new SortedMultiset<number>();
    for (const c of this.grid.cells) {
      colors.add(pos(this.uf.find(c.index)));
    }
    for (const [a, ca] of colors) {
      for (const [b, cb] of colors) {
        if (a >= b) continue;
        if (ca < 2 && cb < 2) continue;
        for (const bb of [b, ~b]) {
          let trial!: Fence;
          try {
            trial = s.update(s.uf.union(a, bb)).iterateToFixedPoint();
            trial.checkRules();
            let uf = PersistentUnionFind.create(this.grid.cells.length);
            const removed = trial.uf.find(a);
            const remaining = new Set<number>();
            // TODO - not actually unioning correctly?
            for (const e of this.grid.edges) {
              const ok = e.halfedges.map(h => h.cell.index)
                  .flatMap(i => trial.uf.find(i) === removed ? [] : [i]);
              for (const i of ok) {
                remaining.add(i);
              }
              if (ok.length === 2) uf = uf.union(ok[0], ok[1]);
            }
//console.log(`removed: ${removed}, remaining: ${[...remaining]}`);
            const domains = new Set<number>();
            for (const c of remaining) {
              domains.add(uf.find(c));
              if (domains.size > 1) throw new Error(`domains: ${[...domains]}`);
            }
          } catch (err) {
            //console.log(`Found contradiction with ${a} ${bb}: ${err.message}\n${trial ? show(trial) : ''}\n`); 
            s = s.update(s.uf.union(a, ~bb));
            s.checkRules();
            break;
            // colors.delete(b); ???
            //return s;
          }
        }
      }
    }
    return s;
  }

  // Returns false if a rule/constraint is broken.
  checkRules() {
    // Look for overpopulated/impossible vertices
    for (const v of this.grid.vertices) {
      const counts: {[typ: string]: number} = {undefined: 0, true: 0, false: 0};
      for (const h of v.incoming) {
        counts[String(this.edgeType(h))]++;
      }
      if (counts.true > 2 || counts.true === 1 && !counts.undefined) {
        throw new Error(`bad vertex ${v.y},${v.x}: ${counts.true} ${counts.undefined}`);
      }
    }
    // Look for cells with bad slitherlink constraint
    for (const [index, count] of this.c.slitherlink) {
      const c = this.grid.cells[index];
      const counts: {[typ: string]: number} = {undefined: 0, true: 0, false: 0};
      for (const h of c.incident) {
        counts[String(this.edgeType(h))]++;
      }
      if (count > counts.undefined + counts.true || count < counts.true) {
        throw new Error(`bad cell ${c.y},${c.x} for ${count}: ${counts.true} ${counts.undefined}`);
      }
    }
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

  setEdgeType(h: Halfedge, wall: boolean): Fence {
try{
    return this.update(this.uf.union(
      h.cell.index,
      wall ? ~h.twin.cell.index : h.twin.cell.index));
}catch(err){
console.log(show(this));
throw err;
}
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
