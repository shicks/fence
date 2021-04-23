import { Edge, Vertex, Cell, Grid} from './grid.js';
import {Fence} from './fence.js';

type Elt = Edge|Vertex|Cell;

// Idea: use \033[38;5;x;48;5;ym where x,y are 1..6, 9..14
// The upper colors are brighter: start with bright primary
// colors paired with dim secondary colors
const colors = [
  0x19, 0x2a, 0x3b, 0x4c, 0x5d, 0x6e,
  0x12, 0x34, 0x56,
  0x1e, 0x2b, 0x49, 0x5a, 0xab, 0xbc, 0x5e,
  0x45, 0x13,
] as const;

export function showCell(c: Cell, f: Fence): unknown {
  if (f.c.slitherlink.has(c.index)) return f.c.slitherlink.get(c.index);
  if (f.c.enclosure.has(c.index)) return `${f.c.enclosure.get(c.index)}#`;
  if (f.c.initial.has(c.index)) return f.c.initial.get(c.index) ? '@' : 'Ψ';
  return '';
}

export function showVert(v: Vertex, f: Fence): unknown {
  if (f.c.masyu.has(v.index)) return f.c.masyu.get(v.index) ? '*' : 'o';
  return '+';
}

export function showGrid(g: Grid,
                         sc: (c: Cell) => unknown,
                         se: (e: Edge) => unknown,
                         sv: (v: Vertex) => unknown): string {
  // Make up the grid of elements.
  const elts: Elt[][] = Array.from({length: g.height * 2 + 1}, () => []);
  for (const v of g.vertices) {
    elts[v.y * 2][v.x * 2] = v;
  }
  for (const c of g.cells) {
    if (c.outside) continue;
    elts[c.y * 2 + 1][c.x * 2 + 1] = c;
  }
  for (const e of g.edges) {
    const h = e.halfedges[0];
    const y = h.vert.y + h.twin.vert.y;
    const x = h.vert.x + h.twin.vert.x;
    elts[y][x] = e;
  }
  // Stringify everything.
  const strs = elts.map(row => row.map(el => {
    switch (el.type) {
    case 'vertex': 
      return sv(el);
    case 'edge':
      return se(el);
    case 'cell':
      return sc(el);
    }
  }));
  return strs.map(row => row.join('')).join('\n');

}

export function show(f: Fence,
                     sc: (c: Cell, f: Fence) => unknown = showCell,
                     sv: (v: Vertex, f: Fence) => unknown = showVert): string {
  // Figure out relevant colors to show
  const colorSet = new Multiset<number>();
  for (const cell of f.grid.cells) {
    colorSet.add(pos(f.uf.find(cell.index)));
  }
  const colorMap = new Map<number, number>();
  for (const [c, count] of colorSet) {
    if (colorMap.size >= colors.length || count < 2) break;
    colorMap.set(c, colors[colorMap.size]);
  }
  // Delegate to showGrid.
  return showGrid(
    f.grid,
    (c) => {
      let col = colorMap.get(pos(f.uf.find(c.index)));
      if (col && f.uf.find(c.index) < 0) col = (col * 0x101) >> 4 & 0xff;
      const txt = (String(sc(c, f)) || '·').padEnd(2, ' ').padStart(3, ' ');
      const esc = col ? `\x1b[38;5;${col & 0xf};48;5;${col >> 4}m` : '';
      return `${esc}${txt}${col ? '\x1b[m' : ''}`;
    }, (e) => {
      const h = e.halfedges[0];
      const c1 = f.uf.find(h.cell.index);
      const c2 = f.uf.find(h.twin.cell.index);
      const horiz = e.direction === 'horizontal';
      if (c1 === c2) {
        let col = colorMap.get(pos(c1));
        if (col && c1 < 0) col = (col * 0x101) >> 4 & 0xff;
        const txt = horiz ? '   ' : ' ';
        const esc = col ? `\x1b[38;5;${col & 0xf};48;5;${col >> 4}m` : '';
        return `${esc}${txt}${col ? '\x1b[m' : ''}`;
      }
      if (c1 === ~c2) return horiz ? '———' : '|';
      return horiz ? '···' : ':';
    }, (v) => sv(v, f));
}

function pos(x: number) {
  return x < 0 ? ~x : x;
}

class Multiset<T> {
  private readonly data = new Map<T, number>();
  add(elem: T) {
    this.data.set(elem, (this.data.get(elem) || 0) + 1);
  }
  [Symbol.iterator]() {
    return [...this.data].sort(([, a], [, b]) => b - a)[Symbol.iterator]();
  }
}
