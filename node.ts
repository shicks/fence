import {Grid, Edge, Vertex, Cell} from './grid.js';
import {Slitherlink} from './fence.js';

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

export function show(sl: Slitherlink): string {
  const elts: Elt[][] = Array.from({length: sl.height * 2 + 1}, () => []);
  for (const v of sl.grid.vertices) {
    elts[v.y * 2][v.x * 2] = v;
  }
  for (const c of sl.grid.cells) {
    if (c.outside) continue;
    elts[c.y * 2 + 1][c.x * 2 + 1] = c;
  }
  for (const e of sl.grid.edges) {
    const h = e.halfedges[0];
    const y = h.vertex.y + h.twin.vertex.y;
    const x = h.vertex.x + h.twin.vertex.x;
    elts[y][x] = e;
  }
  // Figure out relevant colors to show
  const colorSet = new Multiset<number>();
  for (const cell of sl.grid.cells) {
    colorSet.add(pos(sl.uf.find(cell.index)));
  }
  const colorMap = new Map<number, number>();
  for (const [c, count] of colorSet) {
    colorMap.set(c, colors[colorMap.size]);
    if (colorMap.size >= colors.length || count < 2) break;
  }
  // Stringify
  const strs = elts.map(row => row.map(el => {
    switch (el.type) {
    case 'vertex': 
      return '·';
    case 'edge': {
      const h = el.halfedges[0];
      const c1 = sl.uf.find(h.cell.index);
      const c2 = sl.uf.find(h.twin.cell.index);
      const horiz = el.direction === 'horizontal';
      if (c1 === c2) return horiz ? ' × ' : '×';
      if (c1 === ~c2) return horiz ? '———' : '|';
      return horiz ? '   ' : ' ';
    }
    case 'cell': {
      let col = colorMap.get(pos(sl.uf.find(el.index)));
      if (col && sl.uf.find(el.index) < 0) col = (col * 0x101) >> 4 & 0xff;
      const txt = ' ' + (sl.constraints.get(el.index) || '·') + ' ';
      const esc = col && `\x1b[38;5;${col & 0xf};48;5;${col >> 4}m`;
      return `${esc}${txt}${col ? '\x1b[m' : ''}`;
    }
    }
  }));
  return strs.map(row => row.join('')).join('\n');
}

function pos(x: number) {
  return x < 0 ? ~x : x;
}

class Multiset<T> {
  private readonly data = new Map<T, number>();
  add(elem: T) {
    data.set((data.get(elem) || 0) + 1);
  }
  [Symbol.iterator]() {
    return [...data].sort(([, a], [, b]) => b - a)[Symbol.iterator]();
  }
}
