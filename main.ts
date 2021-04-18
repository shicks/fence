import {Sliterlink} from './fence.js';
import {show} from './node.js';

const s = new Slitherlink(10, 10);
s.addConstraint(3, 4, 2);
s.addConstraint(2, 5, 3);
s.addConstraint(2, 6, 0);
s.addConstraint(5, 1, 1);

console.log(show(s));
