import {
  PLAYERS,
  ownMelds,
  structuralCount,
  type Board,
  type Meld,
  type PlayerId,
} from "./model";
import { ALL_TILES, isTile, tileName } from "./tile";
export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
  tile?: number;
}
export interface ValidationResult {
  status: "editing" | "invalid" | "valid";
  issues: ValidationIssue[];
  structuralCount: number;
  known: number[];
  remaining: number[];
}
const isPlayer = (x: unknown): x is PlayerId =>
  Number.isInteger(x) && Number(x) >= 0 && Number(x) < 4;
export function validMeld(m: Meld): boolean {
  const tiles = [...m.tiles].sort((a, b) => a - b);
  if (!tiles.every(isTile)) return false;
  if (m.type === "chi")
    return (
      tiles.length === 3 &&
      tiles[0] < 27 &&
      Math.floor(tiles[0] / 9) === Math.floor(tiles[2] / 9) &&
      tiles[1] === tiles[0] + 1 &&
      tiles[2] === tiles[0] + 2
    );
  return (
    ["pon", "open-kan", "closed-kan"].includes(m.type) &&
    tiles.length === (m.type === "pon" ? 3 : 4) &&
    tiles.every((t) => t === tiles[0])
  );
}
export function validateBoard(board: Board): ValidationResult {
  const issues: ValidationIssue[] = [];
  const known = Array<number>(34).fill(0);
  const sources: Map<string, number>[] = ALL_TILES.map(() => new Map());
  const addIssue = (
    code: string,
    path: string,
    message: string,
    tile?: number,
  ) => issues.push({ code, path, message, tile });
  const count = (tile: number, source: string, path: string) => {
    if (!isTile(tile)) {
      addIssue("tile", path, `${source}含無效牌種 ${tile}`);
      return;
    }
    known[tile]++;
    sources[tile].set(source, (sources[tile].get(source) ?? 0) + 1);
  };
  if (board.version !== 1) addIssue("version", "version", "不支援的盤面版本");
  board.concealed.forEach((t) => count(t, "手牌", "concealed"));
  const ids = new Set<string>();
  for (const item of [...board.melds, ...board.discards]) {
    if (!item.id || ids.has(item.id))
      addIssue("id", "public", `紀錄 ID 缺少或重複：${item.id}`);
    ids.add(item.id);
  }
  board.melds.forEach((m, i) => {
    const path = `melds.${i}`;
    if (!isPlayer(m.owner)) addIssue("player", path, "副露玩家無效");
    if (!validMeld(m))
      addIssue(
        "meld",
        path,
        `${PLAYERS[m.owner] ?? "未知玩家"}的吃碰槓結構不合法`,
      );
    m.tiles.forEach((t) => count(t, `${PLAYERS[m.owner]}副露 ${i + 1}`, path));
    if (
      m.type === "closed-kan" &&
      (m.calledFrom !== undefined || m.calledDiscardId !== undefined)
    )
      addIssue("link", path, "暗槓不能連結他家的捨牌");
    if (
      m.calledFrom !== undefined &&
      (!isPlayer(m.calledFrom) || m.calledFrom === m.owner)
    )
      addIssue("link", path, "叫牌來源必須是另一位玩家");
    if (
      m.type === "chi" &&
      m.calledFrom !== undefined &&
      m.calledFrom !== (m.owner + 3) % 4
    )
      addIssue("link", path, "吃牌來源必須是上家");
    if (m.calledDiscardId !== undefined) {
      const d = board.discards.find((d) => d.id === m.calledDiscardId);
      if (
        !d ||
        d.calledMeldId !== m.id ||
        d.player !== m.calledFrom ||
        !m.tiles.includes(d.tile)
      )
        addIssue("link", path, "副露與被叫走捨牌的牌種、來源或雙向連結不一致");
    }
  });
  board.discards.forEach((d, i) => {
    const path = `discards.${i}`;
    if (!isPlayer(d.player)) addIssue("player", path, "牌河玩家無效");
    if (!isTile(d.tile)) addIssue("tile", path, "牌河含無效牌種");
    if (d.calledMeldId !== undefined) {
      const m = board.melds.find((m) => m.id === d.calledMeldId);
      if (
        !m ||
        m.calledDiscardId !== d.id ||
        m.calledFrom !== d.player ||
        !m.tiles.includes(d.tile) ||
        m.owner === d.player ||
        m.type === "closed-kan"
      )
        addIssue("link", path, "被叫走捨牌找不到一致的副露連結");
    } else count(d.tile, `${PLAYERS[d.player]}牌河`, path);
  });
  for (const tile of ALL_TILES)
    if (known[tile] > 4)
      addIssue(
        "count",
        "public",
        `${tileName(tile)}目前共輸入 ${known[tile]} 張：${[...sources[tile]].map(([s, n]) => `${s} ${n} 張`).join("、")}，超過實際存在的 4 張。`,
        tile,
      );
  for (const player of [0, 1, 2, 3])
    if (board.melds.filter((m) => m.owner === player).length > 5)
      addIssue("meld-count", "melds", `${PLAYERS[player]}副露不能超過 5 組`);
  const flowers = new Set<number>();
  board.flowers.forEach((f, i) => {
    if (
      !Number.isInteger(f.tile) ||
      f.tile < 0 ||
      f.tile > 7 ||
      !isPlayer(f.owner) ||
      flowers.has(f.tile)
    )
      addIssue(
        "flower",
        `flowers.${i}`,
        "花牌必須是八種花牌之一，各限一張，並指定玩家",
      );
    flowers.add(f.tile);
  });
  const n = structuralCount(board);
  if (
    board.drawnTile !== undefined &&
    (!isTile(board.drawnTile) ||
      !board.concealed.includes(board.drawnTile) ||
      n !== 17)
  )
    addIssue("drawn", "drawnTile", "剛摸牌標記必須存在於 17 張狀態的暗手");
  if (n > 17)
    addIssue(
      "structure",
      "concealed",
      `目前 ${n} 張結構牌（暗手 ${board.concealed.length} ＋ ${ownMelds(board).length} 組副露 × 3），超過 17 張`,
    );
  const status = issues.length ? "invalid" : n < 16 ? "editing" : "valid";
  if (status === "editing")
    addIssue(
      "incomplete",
      "concealed",
      `目前 ${n} 張結構牌，還缺 ${16 - n} 張才能分析`,
    );
  return {
    status,
    issues,
    structuralCount: n,
    known,
    remaining: known.map((n) => Math.max(0, 4 - n)),
  };
}
