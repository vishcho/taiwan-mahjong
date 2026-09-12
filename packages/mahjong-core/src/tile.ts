export type TileId = number;
export type TileCounts = Uint8Array;
export const HONORS = ["東", "南", "西", "北", "白", "發", "中"] as const;
export const FLOWERS = [
  "春",
  "夏",
  "秋",
  "冬",
  "梅",
  "蘭",
  "竹",
  "菊",
] as const;
export const NUMBERS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
export const ALL_TILES: TileId[] = Array.from({ length: 34 }, (_, i) => i);
export const isTile = (tile: unknown): tile is TileId =>
  Number.isInteger(tile) && Number(tile) >= 0 && Number(tile) < 34;
export const tileName = (tile: TileId): string =>
  tile >= 27
    ? HONORS[tile - 27]
    : `${NUMBERS[tile % 9]}${["萬", "筒", "索"][Math.floor(tile / 9)]}`;
export const tileCode = (tile: TileId): string =>
  tile >= 27
    ? `${tile - 26}z`
    : `${(tile % 9) + 1}${"mps"[Math.floor(tile / 9)]}`;
export function countsOf(tiles: readonly TileId[]): TileCounts {
  const counts = new Uint8Array(34);
  for (const tile of tiles) {
    if (!isTile(tile) || counts[tile] >= 4)
      throw new Error(`牌種或張數錯誤：${tile}`);
    counts[tile]++;
  }
  return counts;
}
export const tilesOf = (counts: TileCounts): TileId[] =>
  ALL_TILES.flatMap((tile) => Array<number>(counts[tile]).fill(tile));
export function notation(tiles: readonly TileId[]): string {
  return [0, 9, 18, 27]
    .map((start, i) => {
      const ranks = tiles
        .filter((t) => t >= start && t < start + (i === 3 ? 7 : 9))
        .sort((a, b) => a - b)
        .map((t) => t - start + 1)
        .join("");
      return ranks ? ranks + "mpsz"[i] : "";
    })
    .join("");
}
