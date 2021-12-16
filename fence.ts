// Basic structures....?

import { PersistentBinaryUnionFind } from './pbuf.js';
import { Cell, Edge, Grid, Halfedge, Vertex } from './grid.js';
import { show } from './node.js';
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
interface MutableConstraints {
  slitherlink?: SlitherlinkConstraint[];
  masyu?: MasyuConstraint[];
  corral?: CorralConstraint[];
}

interface InternalConstraint {
  readonly slitherlink: ReadonlyMap<number, number>;
  readonly masyu: ReadonlyMap<number, boolean>;
  readonly enclosure: ReadonlyMap<number, number>;
  readonly initial: ReadonlyMap<number, boolean>;
}


function log(f: () => string) {
  if (Fence.logging) console.log(f());
}
  
export class Fence {
  static logging = true;
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

  update(uf: PersistentBinaryUnionFind): Fence {
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
        const unknown = new Set<Edge>();
        unknown.add(edge.halfedges[0].prev.edge);
        unknown.add(edge.halfedges[0].next.edge);
        unknown.add(edge.halfedges[1].prev.edge);
        unknown.add(edge.halfedges[1].next.edge);
        for (const h of edge.halfedges) {
          for (const i of h.cell.incident) {
            if (!unknown.has(i.edge)) s = s.setEdgeType(i, true);
          }
          // Also note that any additional edges eminating from the two vertices
          // (that are not on the dead-end cells) must be x'ed out.
          for (const i of h.vert.incoming) {
            if (!unknown.has(i.edge) && i.edge !== edge) {
              s = s.setEdgeType(i, false);
            }
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
    f = f.enclosureCheck();
    f = f.rangeCheck();
    f = f.vertexCheck();
    return f;
  }

  iterateToFixedPoint(): Fence {
    let f: Fence = this;
    let iterations = 0;
    let f0!: Fence;
    while (f !== f0) {
      f0 = f;
      f = f.iterate();
      if (++iterations > 100) {
        //console.log(`prev:\n${show(f0)}\nnext:\n${show(f)}`);
        throw new Error('no convergence');
      }
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
    return this.processExhaustive(ok, colors, uf);
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

  enclosureCheck(): Fence {
    let uf = this.uf;
    for (const [i, count] of this.c.enclosure) {
      uf = this.enclosureCheckCell(this.grid.cells[i], count, uf);
    }
    return this.update(uf);
  }

  enclosureCheckCell(cell: Cell, count: number, uf: PersistentBinaryUnionFind): PersistentBinaryUnionFind {
    // Given a cell with an enclosure constraint, check its satisfiability.
    // Similar to rangeCheckCell, we search all possible combinations of
    // all cells down a line.
    const bitIndex = new Map<number, number>([[0, 0]]); // maps colors to bits
    const colors: number[] = [0];
    const dirs: number[][] = cell.incident.map(h => {
      const out: number[] = [];
      h = h.twin;
      for (;;) {
        if (h.cell.outside) break;
        const c = uf.find(h.cell.index);
        if (c === 0) break;
        const p = pos(c);
        let bit = bitIndex.get(p);
        if (bit == undefined) {
          bitIndex.set(p, bit = bitIndex.size);
          colors.push(p);
        }
        out.push(c < 0 ? ~bit : bit);
        if (h.cell.incident.length !== 4) {
          throw new Error(`Bad enclosure geometry: ${h.cell.incident.length}`);
        }
        h = h.next.next.twin;
      }
      return out;
    });
    if (colors.length === 1) return uf; // nothing to do
    if (colors.length > 25) return uf; // punt: too much uncertainty ???
    // Otherwise, try all combinations and see what sticks
    const ok =
        Array.from({length: 1 << bitIndex.size - 1}, (_, i) => i).filter(i => {
          i <<= 1; // WLOG the zero bit is always unset
          let enclosed = 1;
          for (const d of dirs) {
            for (const c of d) {
              if (c < 0 ? (~i >>> ~c) & 1 : (i >>> c) & 1) {
                enclosed++;
              } else {
                break;
              }
            }
          }
          return enclosed === count;
        });
    return this.processExhaustive(ok, colors, uf);
  }

  processExhaustive(ok: number[], colors: number[], uf: PersistentBinaryUnionFind): PersistentBinaryUnionFind {
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
      const dirs = [...rectAround(v)].map(h => {
        const dir = [];
        for (const h2 of h ? rectAhead(h.twin) : []) {
          dir.push(h2.twin);
          if (dir.length === 2) break;
        }
        return dir;
      });
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

  checkConnectedWithRemoval(remove: number, fix = false): Fence {
    let s: Fence = this;
    remove = this.uf.find(remove);
    let uf = PersistentUnionFind.create(this.grid.cells.length);
    const remaining = new Set<number>();
    // TODO - not actually unioning correctly?
    for (const e of this.grid.edges) {
      const ok = e.halfedges.map(h => h.cell.index)
        .flatMap(i => this.uf.find(i) === remove ? [] : [i]);
      for (const i of ok) {
        remaining.add(i);
      }
      if (ok.length === 2) uf = uf.union(ok[0], ok[1]);
    }
    //console.log(`remove: ${remove}, remaining: ${[...remaining]}`);
    const domains = new Map<number, number[]>();
    for (const c of remaining) {
      const cc = uf.find(c);
      let mapped = domains.get(cc);
      if (!mapped) domains.set(cc, mapped = []);
      mapped.push(c);
      if (domains.size > 1 && !fix) {
        throw new Error(`domains: ${[...domains]} removing ${remove}`);
      }
    }
    if (fix && domains.size > 1) {
      const best = [...domains.values()].reduce((best, s) => s.length > best.length ? s : best, []);
      for (const d of domains.values()) {
        if (d === best) continue;
        //log(() => `Found a disconnected domain: ${d.join(', ')}`);
        for (const c of d) {
          s = s.update(s.uf.union(remove, c));
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
//try{    
    return this.update(this.uf.union(
      h.cell.index,
      wall ? ~h.twin.cell.index : h.twin.cell.index));
//}catch(err){
//console.log(show(this),'\n',h.id.toString(16),wall);
//throw err;
//}
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

  static random2(h: number, w: number, logger?: Logger): Fence {
    let f = Fence.create(h, w);
    // Attempt to fill cells will 0, one try per cell (but many will fail)
    function pick<T>(xs: readonly T[]): T {
      return xs[Math.floor(Math.random() * xs.length)];
    }
    const outside = [f.grid.cells[0]];
    for (let i = h * w; i > 0; i--) {
      const h1 = pick(pick(outside).incident.filter(h => pos(f.uf.find(h.twin.cell.index)) !== 0));
      try {
        const o = h1.twin.cell;
        let g = f.update(f.uf.union(0, h1.twin.cell.index));
        g = g.vertexCheck();
        g.checkRules();
        g.checkConnectedWithRemoval(0);
        f = g;
        outside.push(o);
      } catch (err) {
        // try a different cell...
      }
    }
    if (logger) logger('random', f);
    return f;
  }

  static random(h: number, w: number, logger?: Logger): Fence {
    let f = Fence.create(h, w);
    // Attempt to fill cells will 0, one try per cell (but many will fail)
    function pick<T>(xs: readonly T[]): T {
      return xs[Math.floor(Math.random() * xs.length)];
    }
    const failed = new Set<Cell>();
    for (let i = 2.5 * h * w; i > 0; i--) {
      const c = pick(f.grid.cells.flatMap(c => {
        if (failed.has(c)) return [];
        const n = c.incident.filter(h => f.uf.find(h.twin.cell.index) === 0).length;
        if (n === 0) return [];
        if (n === 1) return [c, c, c, c, c, c, c, c, c, c, c, c, c, c, c, c];
        return [c];
      }));
      try {
        let g = f.update(f.uf.union(0, c.index));
        g = g.vertexCheck();
        g.checkRules();
        g.checkConnectedWithRemoval(0);
        f = g;
        failed.clear();
      } catch (err) {
        failed.add(c);
        // try a different cell...
      }
    }
    for (const c of f.grid.cells) {
      if (f.uf.find(c.index)) f = f.update(f.uf.union(c.index, -1));
    }
    if (logger) logger('random', f);
    return f;
  }
}

export function createPuzzle(solution: Fence, type: 'slitherlink'|'masyu'|'corral'|'area51' = 'area51') {
  const constraint = {
    slitherlink: new Map<number, number>(),
    masyu: new Map<number, boolean>(),
    enclosure: new Map<number, number>(),
    initial: new Map<number, boolean>(),
  };
  //const constraints: MutableConstraints = {};
  if (type === 'slitherlink' || type === 'area51') {
    // add all slitherlink constraints
    for (const c of solution.grid.cells) {
      if (c.outside) continue;
      constraint.slitherlink.set(c.index, c.incident.filter(h => solution.edgeType(h)).length);
    };
  }
  if (type === 'masyu' || type === 'area51') {
    // add all masyu constraints
    for (const v of solution.grid.vertices) {
      const edges = [...rectAround(v)].flatMap((h, i) => {
        if (!h) return [];
        let count = 0;
        for (const h2 of rectAhead(h.twin)) {
          if (solution.edgeType(h2)) {
            count++;
          } else {
            break;
          }
        }
        return count ? [[count, i]] : [];
      });
      if (edges.length !== 2) continue;
      if ((edges[0][1] ^ edges[1][1]) === 2) {
        // straight through
        if (edges[0][0] > 1 && edges[1][0] > 1) continue;
        constraint.masyu.set(v.index, false);
      } else {
        // right angle
        if (edges[0][0] < 2 || edges[1][0] < 2) continue;
        constraint.masyu.set(v.index, true);
      }
    }
  }
  if (type === 'corral' || type === 'area51') {
    // add all corral constraints
    for (const c of solution.grid.cells) {
      const color = solution.uf.find(c.index);
      if (color === 0) constraint.initial.set(c.index, false);
      if (color === -1) {
        constraint.initial.set(c.index, true);
        let count = 1;
        for (let h of c.incident) {
          h = h.twin;
          while (solution.uf.find(h.cell.index) === -1) {
            count++;
            h = h.next.next.twin;
          }
        }
        constraint.enclosure.set(c.index, count);
      }
    }
  }
  // TODO - remove redundant slitherlink + corral constraints
  function uf(): PersistentBinaryUnionFind {
    return PersistentBinaryUnionFind.create(solution.grid.cells.length);
  }
  const removable: [Map<number, any>, number][] = [];
  let removed = 0;
  let required = 0;
  let remaining = 0;
  let types = new SortedMultiset<string>();
  const maps = new Map<Map<number, any>, string>([
    [constraint.enclosure, 'en'],
    [constraint.initial, 'in'],
    [constraint.masyu, 'ma'],
    [constraint.slitherlink, 'sl']]);
  for (const [map, name] of maps) {
    for (const [k, v] of map) {
      removable.push([map, k]);
      ++remaining;
      const typeKey = name + (typeof v === 'boolean' ? v : '');
      types.add(typeKey);
      // Prefer to remove enclosure constraints and filled circles a little bit more.
      // I think the former is reasonable because there's twice as many
      // opportunities to remove the initial constraints as enclosure,
      // so more of them will end up getting removed initially, maybe?
      if (map === constraint.enclosure) removable.push([map, k]);
      //if (type === 'area51' && map === constraint.masyu && v) removable.push([map, k]);
    }
  }
  function remove<V extends unknown>(map: Map<number, V>, k: number, force = false) {
    if (!map.has(k)) return; // note: will re-test the same failed ones multiple times
    const name = maps.get(map)!;
    const v = map.get(k)!;
    const typeKey = name + (typeof v === 'boolean' ? v : '');
    if (types.count(typeKey) < 2) return; // don't delete the last of any type
    try {
      map.delete(k);
      new Solver(new Fence(solution.grid, uf(), constraint)).solve();
      console.log(`Removed ${name}[${k}]:${v} \t ${++removed} removed, ${--remaining} remaining`);
      types.add(typeKey, -1);
    } catch (err) {
      if (force) throw new Error(`Fail: required redundant clue ${name}[${k}]`);
      map.set(k, v);
      console.log(`Retained ${name}[${k}]:${v} \t ${++required} required, ${--remaining} remaining`);
      if (map !== constraint.masyu) { // NOTE: typecheck fails without `extends unknown`
        for (const m of maps.keys()) {
          if (m === constraint.masyu || m === map) continue;
          if (m.has(k)) remove(m, k, true);
        }
      }
    }
  }
  for (const [map, k] of shuffle(removable)) {
    remove(map, k);
  }

  // let required = 0;
  // let removed = 0;
  // let remaining = constraint.slitherlink.size;
  // for (const [k, v] of shuffle([...constraint.slitherlink])) {
  //   constraint.slitherlink.delete(k);
  //   try {
  //     new Solver(new Fence(solution.grid, uf(), constraint)).solve();
  //     console.log(`Removed ${k}:${v} \t ${++removed} removed, ${--remaining} remaining`);
  //   } catch (err) {
  //     constraint.slitherlink.set(k, v);
  //     console.log(`Failed to remove ${k}:${v} \t ${++required} required, ${--remaining} remaining`);
  //   }
  // }
  return new Fence(solution.grid, uf(), constraint);
}

function shuffle<T>(xs: T[]): T[] {
  const out = [...xs];
  for (let i = 0; i < xs.length - 1; i++) {
    const j = Math.floor(Math.random() * (xs.length - i - 1)) + i + 1;
    const tmp = out[j];
    out[j] = out[i];
    out[i] = tmp;
  }
  return out;
}


type Logger = (msg: string, f: Fence) => void;

export class Solver {
  fence: Fence;
  constructor(fence: Fence) {
    this.fence = fence;
  }

  solve(logger?: Logger): Fence {
    if (logger) logger('initial state', this.fence);
    this.fence = this.fence.handleInitialCases();
    let i = 100;
    let progress;
    do {
      progress = false;
      if (this.iterateToFixedPoint()) progress = true;
      if (this.slowChecks()) progress = true;
      //if (progress) console.log(show(s.fence), '\n');
    } while (progress && --i);
    for (const c of this.fence.grid.cells) {
      if (pos(this.fence.uf.find(c.index))) {
        const reason = i ? `fixed point` : `gave up`;
        if (logger) logger('failed', this.fence);
        throw new Error(`Unable to solve puzzle: ${reason}`);
      }
    }
    if (logger) logger('solved', this.fence);
    return this.fence;
  }

  iterateToFixedPoint(): boolean { // true if progress was made
    const init = this.fence;
    this.fence = this.fence.iterateToFixedPoint();
    return this.fence !== init;
  }

  slowChecks(): boolean {
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
    for (const c of this.fence.grid.cells) {
      colors.add(pos(this.fence.uf.find(c.index)));
    }
    //log(() => `Colors: {${[...colors].map(([x,c]) => `${x}: ${c}`).join(', ')}}\n${show(this.fence)}\n`);
    let progress = false;
    // First look for any fully-surrounded cells: they need to be the same color
    // as what's surrounding them.  If we don't do this upfront then arbitrary
    // two-element removals will incorrectly look like contradictions when they
    // were actually unrelated.
    for (const c of colors) {
      for (const cc of [c[0], ~c[0]]) {
        const f = this.fence.checkConnectedWithRemoval(cc, true);
        if (f !== this.fence) {
          progress = true;
          this.fence = f;
          break;
        }
      }
    }
    // Now check for pairs of colors we can union to see if they lead to a
    // contradiction.
    const deleted = new Set<number>();
    for (const [a, ca] of colors) {
      if (deleted.has(a)) continue;
      for (const [b, cb] of colors) {
        if (a >= b) continue;
        if (ca < 2 && cb < 2) continue;
        for (const bb of [b, ~b]) {
          //log(() => `Check ${a} ${bb}`);
          let trial!: Fence;
          try {
            trial = this.fence.update(this.fence.uf.union(a, bb)).iterateToFixedPoint();
            trial.checkRules();
            trial.checkConnectedWithRemoval(a);
            trial.checkConnectedWithRemoval(~a);
            //log(() => show(trial));
          } catch (err) {
            //log(() => `Found contradiction with ${a} ${bb}: ${err.message}\n${trial ? show(trial) : ''}\n`); 
            this.fence = this.fence.update(this.fence.uf.union(a, ~bb));
            this.fence.checkRules();
            progress = true;
            //return true;
            deleted.add(b);
            //colors.deleteAll(b); //???
            //return s;
          }
        }
      }
    }
    return progress;
  }
}

// Given a vertex, generates the four halfedges around it, leaving
// blanks for external directions with no edges.
function* rectAround(v: Vertex): Generator<Halfedge|null> {
  for (const h of v.incoming) {
    yield h;
    if (h.cell.outside) {
      for (let i = v.incoming.length; i < 4; i++) {
        yield null;
      }
    }
  }
}

// Given a halfedge, generates halfedges in a straight line.
function* rectAhead(h: Halfedge): Generator<Halfedge> {
  let turns;
  do {
    yield h;
    turns = 2;
    while (turns > 0) {
      turns -= h.cell.outside ? 5 - h.vert.incoming.length : 1;
      h = h.next.twin;
    }
    h = h.twin;
  } while (turns === 0);
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
