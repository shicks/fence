import { Edge, Grid } from './grid.js';
import { showGrid } from './node.js';

const g = new Grid(5, 5);
for (const i of [0, 2, 5, 17, 18, 30, 32, 35]) {
const v = g.vertices[i];
const m = new Map<Edge, string>();
let dir = 1;
for (const h of v.incoming) {
  let len = 1;
  let h2 = h;
  while (true) {
    const str = h2.edge.direction === 'horizontal' ? `-${len++}-` : `${len++}`;
    m.set(h2.edge, `\x1b[1;3${dir}m${str}\x1b[m`);
    h2 = h2.twin;
    let turns = 2;
    while (turns > 0) {
      turns -= h2.cell.outside ? 5 - h2.vert.incoming.length : 1;
      h2 = h2.next.twin;
    }
    if (turns !== 0) break;
  }
  dir++;
  if (h.cell.outside) {
    for (let i = v.incoming.length; i < 4; i++) {
      dir++;
    }
  }
}
console.log(showGrid(g, () => '   ', e => m.get(e) || (e.direction === 'horizontal' ? '---' : '|'), () => '+'));
}
