import { cloneBoard, ownMelds, type Board } from "./model";
import { ALL_TILES, countsOf, type TileCounts, type TileId } from "./tile";
import { validateBoard, type ValidationResult } from "./validation";
import { isWinning, referenceShanten, type Decomposition } from "./reference";
import { base5 } from "./table";
export interface ShantenEngine {
  shanten(hand: TileCounts, open: number, fixed: TileCounts): number;
}
export interface TileAnalysis {
  tile: TileId;
  remaining: number;
}
export interface Efficiency {
  shanten: number;
  effectiveTiles: TileAnalysis[];
  exhaustedTiles: TileId[];
  ukeire: number;
  kinds: number;
}
export interface DiscardOption extends Efficiency {
  tile: TileId;
  best: boolean;
}
export interface ImprovementAnalysis {
  drawTile: TileId;
  remainingBeforeDraw: number;
  bestDiscard: TileId[];
  oldUkeire: number;
  newUkeire: number;
  deltaUkeire: number;
}
export interface AnalysisDetail {
  efficiency: Efficiency;
  improvementTiles: ImprovementAnalysis[];
  bestDecompositions: Decomposition[];
  decompositionTruncated: boolean;
  formulaShanten: number;
}
export interface AnalysisResult {
  mode: "draw" | "discard" | "won" | "invalid" | "editing";
  validation: ValidationResult;
  current?: Efficiency;
  discardOptions: DiscardOption[];
  winningDecompositions?: Decomposition[];
}
export const compareEfficiency = (a: Efficiency, b: Efficiency): number =>
  a.shanten - b.shanten || b.ukeire - a.ukeire || b.kinds - a.kinds;
/** Per-board analysis context: all simulation state is private; public information is immutable.
 * Shanten cache includes concealed/fixed melds; efficiency isn't cached across remaining pools.
 */
export class Analyzer {
  readonly board: Board;
  readonly validation: ValidationResult;
  readonly hand: TileCounts;
  readonly fixed: TileCounts;
  readonly open: number;
  private shantenCache = new Map<string, number>();
  constructor(
    board: Board,
    private engine: ShantenEngine,
  ) {
    this.board = cloneBoard(board);
    this.validation = validateBoard(this.board);
    this.open = ownMelds(this.board).length;
    this.hand =
      this.validation.status === "valid"
        ? countsOf(this.board.concealed)
        : new Uint8Array(34);
    this.fixed =
      this.validation.status === "valid"
        ? countsOf(ownMelds(this.board).flatMap((m) => m.tiles))
        : new Uint8Array(34);
  }
  shanten(hand: TileCounts): number {
    const key = `${base5(hand, 0, 9)}:${base5(hand, 9, 9)}:${base5(hand, 18, 9)}:${base5(hand, 27, 7)}`;
    let value = this.shantenCache.get(key);
    if (value === undefined) {
      value = this.engine.shanten(hand, this.open, this.fixed);
      if (this.shantenCache.size > 80000) this.shantenCache.clear();
      this.shantenCache.set(key, value);
    }
    return value;
  }
  effective(
    hand: TileCounts,
    remaining: readonly number[],
    value = this.shanten(hand),
  ): Efficiency {
    const effectiveTiles: TileAnalysis[] = [],
      exhaustedTiles: TileId[] = [];
    let ukeire = 0;
    for (const tile of ALL_TILES) {
      if (hand[tile] + this.fixed[tile] >= 4) continue;
      hand[tile]++;
      // A nonwinning 17-tile target always leaves a surplus tile to discard.
      // Thus target deficit after drawing equals min over legal concealed discards.
      // Exhaustive draw/discard tests verify this shortcut independently.
      const effective =
        value === 0 ? isWinning(hand, this.open) : this.shanten(hand) < value;
      hand[tile]--;
      if (!effective) continue;
      if (remaining[tile] > 0) {
        effectiveTiles.push({ tile, remaining: remaining[tile] });
        ukeire += remaining[tile];
      } else exhaustedTiles.push(tile);
    }
    return {
      shanten: value,
      effectiveTiles,
      exhaustedTiles,
      ukeire,
      kinds: effectiveTiles.length,
    };
  }
  discards(
    hand: TileCounts,
    remaining: readonly number[],
    onlyBestShanten = false,
  ): DiscardOption[] {
    const options: DiscardOption[] = [];
    let bestS = 10;
    const values: { tile: TileId; value: number }[] = [];
    for (const tile of ALL_TILES)
      if (hand[tile]) {
        hand[tile]--;
        const value = this.shanten(hand);
        hand[tile]++;
        bestS = Math.min(bestS, value);
        values.push({ tile, value });
      }
    for (const { tile, value } of values) {
      if (onlyBestShanten && value > bestS) continue;
      hand[tile]--;
      options.push({
        tile,
        best: false,
        ...this.effective(hand, remaining, value),
      });
      hand[tile]++;
    }
    options.sort((a, b) => compareEfficiency(a, b) || a.tile - b.tile);
    for (const option of options)
      option.best = compareEfficiency(option, options[0]) === 0;
    return options;
  }
  improvements(
    hand: TileCounts,
    remaining: readonly number[],
    current = this.effective(hand, remaining),
  ): ImprovementAnalysis[] {
    const improvements: ImprovementAnalysis[] = [];
    const pool = [...remaining];
    for (const drawTile of ALL_TILES) {
      if (pool[drawTile] <= 0 || hand[drawTile] + this.fixed[drawTile] >= 4)
        continue;
      // Effective draws already lower shanten (or win), and cannot be improvements.
      if (current.effectiveTiles.some((t) => t.tile === drawTile)) continue;
      hand[drawTile]++;
      pool[drawTile]--;
      const options = this.discards(hand, pool, true);
      pool[drawTile]++;
      hand[drawTile]--;
      const best = options[0];
      if (
        best &&
        best.shanten === current.shanten &&
        best.ukeire > current.ukeire
      )
        improvements.push({
          drawTile,
          remainingBeforeDraw: remaining[drawTile],
          bestDiscard: options.filter((o) => o.best).map((o) => o.tile),
          oldUkeire: current.ukeire,
          newUkeire: best.ukeire,
          deltaUkeire: best.ukeire - current.ukeire,
        });
    }
    return improvements.sort(
      (a, b) => b.deltaUkeire - a.deltaUkeire || a.drawTile - b.drawTile,
    );
  }
  analyze(): AnalysisResult {
    const { validation } = this;
    if (validation.status !== "valid")
      return { mode: validation.status, validation, discardOptions: [] };
    if (validation.structuralCount === 17) {
      if (isWinning(this.hand, this.open))
        return {
          mode: "won",
          validation,
          discardOptions: [],
          winningDecompositions: referenceShanten(this.hand, this.open)
            .bestDecompositions,
        };
      return {
        mode: "discard",
        validation,
        discardOptions: this.discards(this.hand.slice(), validation.remaining),
      };
    }
    return {
      mode: "draw",
      validation,
      current: this.effective(this.hand.slice(), validation.remaining),
      discardOptions: [],
    };
  }
  detail(discard?: TileId): AnalysisDetail {
    if (this.validation.status !== "valid") throw new Error("盤面尚不可分析");
    const hand = this.hand.slice();
    if (this.validation.structuralCount === 17) {
      if (discard === undefined || !hand[discard])
        throw new Error("請指定暗手中的候選捨牌");
      hand[discard]--;
    }
    const efficiency = this.effective(hand, this.validation.remaining);
    const decomposition = referenceShanten(hand, this.open, 256);
    return {
      efficiency,
      improvementTiles: this.improvements(
        hand,
        this.validation.remaining,
        efficiency,
      ),
      bestDecompositions: decomposition.bestDecompositions,
      decompositionTruncated: decomposition.truncated,
      formulaShanten: decomposition.shanten,
    };
  }
}
