import { Fence } from './fence.js';
import { show } from './node.js';

let s1 = Fence.create(10, 10, {
  slitherlink: [[3, 4, 2],
                [5, 4, 0],
                [4, 5, 2],
                [4, 1, 3],
                [6, 3, 2],
                [9, 9, 3],
                [9, 0, 1],
                [1, 7, 3],
                [3, 7, 1],
                [6, 6, 3],
                [6, 7, 3],
                [7, 8, 3],
                [2, 5, 3],
                [2, 6, 0],
                [2, 2, 3],
                [3, 2, 0]]});

let s2 = Fence.create(7, 7, {
  slitherlink: [[0, 0, 2],
                [0, 1, 2],
                [0, 2, 2],
                [0, 3, 3],
                [0, 4, 3],
                [0, 5, 1],
                [1, 2, 0],
                [1, 3, 2],
                [1, 5, 3],
                [3, 0, 3],
                [3, 1, 3],
                [3, 4, 3],
                [3, 5, 3],
                [4, 2, 2],
                [4, 4, 2],
                [5, 0, 3],
                [5, 2, 2],
                [5, 4, 2],
                [5, 5, 2],
                [6, 0, 3],
                [6, 2, 2],
                [6, 5, 3]],
  masyu: [[2, 2, true],
          [3, 2, false]],
  corral: [[2, 4, 6],
           [5, 3, false],
           [5, 1, true]]});

s2 = Fence.create(7, 7, {
  masyu: [[1, 1],
          [1, 3],
          [2, 2],
          [2, 3],
          [2, 6],
          [2, 7],
          [3, 1],
          [3, 3],
          [3, 6],
          [4, 0, true],
          [5, 7],
          [6, 1],
          [6, 2],
          [6, 3],
          [6, 4],
          [6, 5]]});

let [s] = [s2, s1, s2];

let s0!: Fence;
let i = 0;
s = s.handleInitialCases();
while (s !== s0) {
  s0 = s;
  s = s.iterate();
  console.log(show(s), '\n');
  if (i++ > 20) break;
}
//(PersistentBinaryUnionFind as any).EXPECT_FROZEN = true;
//(s as any).EXPECT_FROZEN = true;
//s.rangeCheck();
//s.vertexCheck();

// , c => {const r=s.range(c.y,c.x);return r.join(',');}
// console.log(show(s));
