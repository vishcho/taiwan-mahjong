import { countsOf, type TileCounts, type TileId } from "./tile";
export type GroupKind = "meld" | "pair" | "taatsu" | "isolated";
export interface Group {
  kind: GroupKind;
  tiles: TileId[];
}
export interface Decomposition {
  groups: Group[];
  shanten: number;
}
export interface ReferenceResult {
  shanten: number;
  bestDecompositions: Decomposition[];
  truncated: boolean;
}
export const score = (meld: number, pair: number, taatsu: number): number =>
  10 - 2 * meld - Math.min(taatsu, 5 - meld) - pair;
/** Exhaustive, deliberately independent of the table recurrence; no greedy pair choice. */
export function referenceShanten(
  input: TileCounts,
  openMelds = 0,
  limit = 32,
): ReferenceResult {
  const hand = input.slice();
  let best = 10;
  const solutions = new Map<string, Decomposition>();
  let truncated = false;
  const groups: Group[] = [];
  function visit(start: number, meld: number, pair: number, taatsu: number) {
    while (start < 34 && !hand[start]) start++;
    if (start === 34) {
      const value = score(meld, pair, taatsu);
      if (value < best) {
        best = value;
        solutions.clear();
        truncated = false;
      }
      if (value === best && limit > 0) {
        const sorted = [...groups].sort(
          (a, b) => a.tiles[0] - b.tiles[0] || a.kind.localeCompare(b.kind),
        );
        const key = sorted
          .map((g) => `${g.kind}:${g.tiles.join(",")}`)
          .join("/");
        if (!solutions.has(key)) {
          if (solutions.size < limit)
            solutions.set(key, {
              shanten: value,
              groups: sorted.map((g) => ({
                kind: g.kind,
                tiles: [...g.tiles],
              })),
            });
          else truncated = true;
        }
      }
      return;
    }
    const take = (
      tiles: number[],
      kind: GroupKind,
      m: number,
      p: number,
      t: number,
    ) => {
      tiles.forEach((tile) => hand[tile]--);
      groups.push({ kind, tiles });
      visit(start, m, p, t);
      groups.pop();
      tiles.forEach((tile) => hand[tile]++);
    };
    if (meld < 5) {
      if (hand[start] >= 3)
        take([start, start, start], "meld", meld + 1, pair, taatsu);
      if (start < 27 && start % 9 < 7 && hand[start + 1] && hand[start + 2])
        take([start, start + 1, start + 2], "meld", meld + 1, pair, taatsu);
    }
    if (hand[start] >= 2) {
      if (!pair) take([start, start], "pair", meld, 1, taatsu);
      if (taatsu < 5) take([start, start], "taatsu", meld, pair, taatsu + 1);
    }
    if (start < 27 && taatsu < 5)
      for (const distance of [1, 2]) {
        if ((start % 9) + distance < 9 && hand[start + distance])
          take([start, start + distance], "taatsu", meld, pair, taatsu + 1);
      }
    take([start], "isolated", meld, pair, taatsu);
  }
  visit(0, openMelds, 0, 0);
  return {
    shanten: best,
    bestDecompositions: [...solutions.values()],
    truncated,
  };
}
/** Standard win predicate, separate from shanten and taatsu logic. */
export function isWinning(input: TileCounts, openMelds = 0): boolean {
  if (
    input.reduce((a, b) => a + b, 0) !== (5 - openMelds) * 3 + 2 ||
    input.some((n) => n > 4)
  )
    return false;
  const hand = input.slice();
  function meldsOnly(): boolean {
    const first = hand.findIndex((n) => n > 0);
    if (first < 0) return true;
    if (hand[first] >= 3) {
      hand[first] -= 3;
      const ok = meldsOnly();
      hand[first] += 3;
      if (ok) return true;
    }
    if (first < 27 && first % 9 < 7 && hand[first + 1] && hand[first + 2]) {
      hand[first]--;
      hand[first + 1]--;
      hand[first + 2]--;
      const ok = meldsOnly();
      hand[first]++;
      hand[first + 1]++;
      hand[first + 2]++;
      return ok;
    }
    return false;
  }
  for (let tile = 0; tile < 34; tile++)
    if (hand[tile] >= 2) {
      hand[tile] -= 2;
      const ok = meldsOnly();
      hand[tile] += 2;
      if (ok) return true;
    }
  return false;
}
export const referenceTiles = (tiles: TileId[], open = 0) =>
  referenceShanten(countsOf(tiles), open);
