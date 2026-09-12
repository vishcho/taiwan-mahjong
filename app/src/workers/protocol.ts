import type {
  AnalysisDetail,
  AnalysisResult,
  Board,
  TileId,
} from "@taiwan-mahjong/core";
export type WorkerRequest =
  | { id: number; board: Board; kind: "analyze" }
  | { id: number; board: Board; kind: "detail"; discard?: TileId };
export type WorkerReply =
  | { id: number; kind: "analyze"; result: AnalysisResult }
  | { id: number; kind: "detail"; detail: AnalysisDetail }
  | { id: number; kind: "error"; error: string }
  | { id: 0; kind: "ready" };
