import type { TileId } from "./tile";
export type PlayerId = 0 | 1 | 2 | 3;
export const PLAYERS = ["自己", "下家", "對家", "上家"] as const;
export type MeldType = "chi" | "pon" | "open-kan" | "closed-kan";
export interface Meld {
  id: string;
  type: MeldType;
  tiles: TileId[];
  owner: PlayerId;
  calledFrom?: PlayerId;
  calledDiscardId?: string;
}
export interface Discard {
  id: string;
  tile: TileId;
  player: PlayerId;
  /** Array order is authoritative; a called discard references its unique meld. */
  calledMeldId?: string;
  tsumogiri?: boolean;
}
export interface Board {
  version: 1;
  concealed: TileId[];
  melds: Meld[];
  discards: Discard[];
  flowers: { tile: number; owner: PlayerId }[];
  drawnTile?: TileId;
}
export const emptyBoard = (): Board => ({
  version: 1,
  concealed: [],
  melds: [],
  discards: [],
  flowers: [],
});
export const cloneBoard = (board: Board): Board =>
  JSON.parse(JSON.stringify(board)) as Board;
export const ownMelds = (board: Board): Meld[] =>
  board.melds.filter((m) => m.owner === 0);
export const structuralCount = (board: Board): number =>
  board.concealed.length + 3 * ownMelds(board).length;
