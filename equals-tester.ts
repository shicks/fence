import {Equaler} from './equaler.js';

export class EqualsTester {
  private readonly groups: unknown[][] = [];
  private collisionsOk = false;
  constructor(private readonly equaler: Equaler) {}
  addEqualityGroup(...objs: unknown[]): this {
    this.groups.push(objs);
    return this;
  }
  allowHashCollisions(): this {
    this.collisionsOk = true;
    return this;
  }
  testEqualsAndHashCode(): void {
    for (let i1 = 0; i1 < this.groups.length; i1++) {
      const g1 = this.groups[i1];
      for (let i2 = 0; i2 < this.groups.length; i2++) {
        const g2 = this.groups[i2];
        for (let j1 = 0; j1 < g1.length; j1++) {
          let h1;
          try {
            h1 = this.equaler.hash(g1[j1]);
          } catch {}
          for (let j2 = 0; j2 < g2.length; j2++) {
            const equal = this.equaler.equal(g1[j1], g2[j2]);
            if (equal !== (i1 === i2)) {
              throw new Error(`Expected to${i1 !== i2 ? ' not' : ''
                  } be equal: ${g1[j1]} (group ${i1}, item ${j1}) and ${g2[j2]
                  } (group ${i2}, item ${j2})`);
            }
            let h2;
            try {
              h2 = this.equaler.hash(g2[j2]);
            } catch {}
            if (h1 == null || h2 == null) continue;
            if (equal && h1 !== h2) {
              throw new Error(`Expected equal hash codes in group ${i1}: ${
                  g1[j1]} (item ${j1}) hashed to ${h1} but ${g2[j2]} (item ${j2
                  }) hashed to ${h2}`);
            } else if (!equal && !this.collisionsOk && h1 === h2) {
              throw new Error(`Hash collision: ${g1[j1]} (group ${i1}, item ${j1
                  }) and ${g2[j2]} (group ${i2}, item ${j2}) both hashed to ${h1
                  }`);
            }
          }
        }
      }
    }
  }
}
