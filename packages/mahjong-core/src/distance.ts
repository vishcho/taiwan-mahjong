import type { TileCounts } from "./tile";
import { base5, POW5, SLOTS } from "./table";
/** Exact distance to a capacity-valid winning target. Unlike the taatsu formula,
 * this cannot wait on a fifth copy (e.g. 1111z plus four complete melds).
 * Cost is the missing tiles in the target; shanten = cost - 1.
 */
export function generateDistanceTable(
  completeStates: Int8Array,
  length: 7 | 9,
): Uint8Array {
  const table = new Uint8Array(POW5[length] * SLOTS).fill(63);
  for (let key = 0; key < POW5[length]; key++) {
    let n = key,
      total = 0;
    for (let i = 0; i < length; i++) {
      total += n % 5;
      n = Math.floor(n / 5);
    }
    const p = total % 3 === 2 ? 1 : 0;
    const m = (total - p * 2) / 3;
    if (
      Number.isInteger(m) &&
      m <= 5 &&
      completeStates[key * SLOTS + m * 2 + p] === 0
    )
      table[key * SLOTS + m * 2 + p] = 0;
  }
  // Separable min-plus transform: extra held tiles cost 0; missing target tiles cost 1.
  for (let axis = 0; axis < length; axis++) {
    const stride = POW5[axis] * SLOTS;
    const block = stride * 5;
    for (let start = 0; start < table.length; start += block)
      for (let sub = 0; sub < stride; sub++) {
        for (let digit = 3; digit >= 0; digit--) {
          const at = start + sub + digit * stride;
          table[at] = Math.min(table[at], table[at + stride] + 1);
        }
        for (let digit = 1; digit < 5; digit++) {
          const at = start + sub + digit * stride;
          table[at] = Math.min(table[at], table[at - stride]);
        }
      }
  }
  return table;
}
/** Independent bounded target DFS/DP for reference and suits constrained by fixed melds.
 * At each rank enumerate sequence starts, a triplet and an eye; carry two sequence tails.
 */
export function targetCosts(
  hand: ArrayLike<number>,
  fixed: ArrayLike<number>,
  length: 7 | 9,
  maxMelds = 5,
): Uint8Array {
  let states = new Map<number, number>([[0, 0]]);
  const encode = (a: number, b: number, m: number, p: number) =>
    ((m * 2 + p) * 5 + a) * 5 + b;
  for (let rank = 0; rank < length; rank++) {
    const next = new Map<number, number>();
    for (const [state, cost] of states) {
      const b = state % 5,
        a = Math.floor(state / 5) % 5;
      const slot = Math.floor(state / 25),
        p = slot % 2,
        m = Math.floor(slot / 2);
      const cap = 4 - fixed[rank];
      const maxSeq =
        length === 9 && rank < 7 ? Math.min(cap - a - b, maxMelds - m) : 0;
      for (let s = 0; s <= maxSeq; s++)
        for (let triple = 0; triple <= 1; triple++)
          for (let pair = 0; pair <= 1 - p; pair++) {
            const total = a + b + s + triple * 3 + pair * 2;
            if (total > cap || m + s + triple > maxMelds) continue;
            const key = encode(b, s, m + s + triple, p + pair);
            const value = cost + Math.max(0, total - hand[rank]);
            if (value < (next.get(key) ?? 63)) next.set(key, value);
          }
    }
    states = next;
  }
  const costs = new Uint8Array(SLOTS).fill(63);
  for (const [state, cost] of states)
    if (state % 25 === 0) costs[Math.floor(state / 25)] = cost;
  return costs;
}
export interface DistanceTables {
  suit: Uint8Array;
  honors: Uint8Array;
}
export function mergeCosts(entries: Uint8Array[], open: number): number {
  let dp = new Uint8Array(SLOTS).fill(63);
  dp[open * 2] = 0;
  for (const entry of entries) {
    const next = new Uint8Array(SLOTS).fill(63);
    for (let m = open; m <= 5; m++)
      for (let p = 0; p <= 1; p++) {
        if (dp[m * 2 + p] === 63) continue;
        for (let n = 0; n + m <= 5; n++)
          for (let q = 0; q + p <= 1; q++) {
            const at = (m + n) * 2 + p + q;
            next[at] = Math.min(next[at], dp[m * 2 + p] + entry[n * 2 + q]);
          }
      }
    dp = next;
  }
  return dp[11] - 1;
}
export function targetShanten(
  hand: TileCounts,
  open = 0,
  fixed: TileCounts = new Uint8Array(34),
): number {
  return mergeCosts(
    [0, 9, 18, 27].map((start, i) =>
      targetCosts(
        hand.subarray(start, start + (i === 3 ? 7 : 9)),
        fixed.subarray(start, start + (i === 3 ? 7 : 9)),
        i === 3 ? 7 : 9,
        5 - open,
      ),
    ),
    open,
  );
}
export class DistanceEngine {
  private cache = new Map<string, Uint8Array>();
  constructor(readonly tables: DistanceTables) {
    if (
      tables.suit.length !== POW5[9] * SLOTS ||
      tables.honors.length !== POW5[7] * SLOTS ||
      tables.suit[0] !== 0 ||
      tables.honors[0] !== 0
    )
      throw new Error("距離查表格式不正確");
  }
  shanten(
    hand: TileCounts,
    open = 0,
    fixed: TileCounts = new Uint8Array(34),
  ): number {
    const entries = [0, 9, 18, 27].map((start, i) => {
      const length = i === 3 ? 7 : 9;
      const key = base5(hand, start, length);
      const fixedKey = base5(fixed, start, length);
      if (!fixedKey) {
        const table = i === 3 ? this.tables.honors : this.tables.suit;
        return table.subarray(key * SLOTS, (key + 1) * SLOTS);
      }
      const cacheKey = `${length}:${key}:${fixedKey}:${open}`;
      let costs = this.cache.get(cacheKey);
      if (!costs) {
        costs = targetCosts(
          hand.subarray(start, start + length),
          fixed.subarray(start, start + length),
          length,
          5 - open,
        );
        if (this.cache.size > 20000) this.cache.clear();
        this.cache.set(cacheKey, costs);
      }
      return costs;
    });
    return mergeCosts(entries, open);
  }
}
