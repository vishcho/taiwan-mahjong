import type { TileCounts } from "./tile";
import { score } from "./reference";
export const TABLE_VERSION = 1;
export const SLOTS = 12;
export const POW5 = Array.from({ length: 10 }, (_, i) => 5 ** i);
export interface LookupTables {
  suit: Int8Array;
  honors: Int8Array;
}
export interface TableManifest {
  version: number;
  slots: number;
  suit: TableFile;
  honors: TableFile;
}
export interface TableFile {
  file: string;
  bytes: number;
  rawBytes: number;
  checksum: string;
}
export function base5(
  counts: ArrayLike<number>,
  start = 0,
  length = counts.length,
): number {
  let key = 0;
  for (let i = 0; i < length; i++) key += counts[start + i] * POW5[i];
  return key;
}
/** Bottom-up recurrence: remove a group containing the first tile. All children have smaller keys. */
export function generateTable(length: 7 | 9): Int8Array {
  const table = new Int8Array(POW5[length] * SLOTS).fill(-1);
  table[0] = 0;
  const counts = new Uint8Array(length);
  for (let key = 1; key < POW5[length]; key++) {
    let rest = key;
    for (let i = 0; i < length; i++) {
      counts[i] = rest % 5;
      rest = Math.floor(rest / 5);
    }
    const first = counts.findIndex((n) => n > 0);
    const offset = key * SLOTS;
    const merge = (child: number, dm: number, dp: number, dt: number) => {
      const source = child * SLOTS;
      for (let m = 0; m + dm <= 5; m++)
        for (let p = 0; p + dp <= 1; p++) {
          const t = table[source + m * 2 + p];
          if (t < 0) continue;
          const dest = offset + (m + dm) * 2 + p + dp;
          table[dest] = Math.max(table[dest], Math.min(5, t + dt));
        }
    };
    merge(key - POW5[first], 0, 0, 0);
    if (counts[first] >= 2) {
      merge(key - 2 * POW5[first], 0, 1, 0);
      merge(key - 2 * POW5[first], 0, 0, 1);
    }
    if (counts[first] >= 3) merge(key - 3 * POW5[first], 1, 0, 0);
    if (length === 9) {
      for (const d of [1, 2])
        if (first + d < 9 && counts[first + d])
          merge(key - POW5[first] - POW5[first + d], 0, 0, 1);
      if (first < 7 && counts[first + 1] && counts[first + 2])
        merge(key - POW5[first] - POW5[first + 1] - POW5[first + 2], 1, 0, 0);
    }
  }
  return table;
}
export function assertTables(tables: LookupTables): void {
  if (
    tables.suit.length !== POW5[9] * SLOTS ||
    tables.honors.length !== POW5[7] * SLOTS ||
    tables.suit[0] !== 0 ||
    tables.honors[0] !== 0
  )
    throw new Error("查表格式或長度不正確，請重新載入");
}
export class LookupEngine {
  private dp = new Int8Array(SLOTS);
  private next = new Int8Array(SLOTS);
  constructor(readonly tables: LookupTables) {
    assertTables(tables);
  }
  shanten(counts: TileCounts, open = 0): number {
    this.dp.fill(-1);
    this.dp[open * 2] = 0;
    for (let suit = 0; suit < 4; suit++) {
      const table = suit === 3 ? this.tables.honors : this.tables.suit;
      const key = base5(counts, suit * 9, suit === 3 ? 7 : 9) * SLOTS;
      this.next.fill(-1);
      for (let m = open; m <= 5; m++)
        for (let p = 0; p <= 1; p++) {
          const t = this.dp[m * 2 + p];
          if (t < 0) continue;
          for (let lm = 0; lm + m <= 5; lm++)
            for (let lp = 0; lp + p <= 1; lp++) {
              const lt = table[key + lm * 2 + lp];
              if (lt < 0) continue;
              const target = (m + lm) * 2 + p + lp;
              this.next[target] = Math.max(this.next[target], t + lt);
            }
        }
      [this.dp, this.next] = [this.next, this.dp];
    }
    let best = 10;
    for (let m = open; m <= 5; m++)
      for (let p = 0; p <= 1; p++) {
        const t = this.dp[m * 2 + p];
        if (t >= 0) best = Math.min(best, score(m, p, t));
      }
    return best;
  }
}
