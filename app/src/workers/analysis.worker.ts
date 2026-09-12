/// <reference lib="webworker" />
import {
  Analyzer,
  DistanceEngine,
  TABLE_VERSION,
  SLOTS,
  type TableManifest,
  type TableFile,
} from "@taiwan-mahjong/core";
import { gunzipSync } from "fflate";
import type { WorkerReply, WorkerRequest } from "./protocol";
declare const self: DedicatedWorkerGlobalScope;
let engine: DistanceEngine;
let lastBoard = "";
let analyzer: Analyzer;
const send = (reply: WorkerReply) => self.postMessage(reply);
async function load(file: TableFile): Promise<Uint8Array> {
  const response = await fetch(`/tables/${file.file}`);
  if (!response.ok)
    throw new Error(`查表下載失敗（${response.status}），請重試`);
  const compressed = new Uint8Array(await response.arrayBuffer());
  // Some static hosts mark .gz with Content-Encoding; fetch has already inflated it.
  const data =
    compressed[0] === 0x1f && compressed[1] === 0x8b
      ? gunzipSync(compressed)
      : compressed;
  if (data.length !== file.rawBytes) throw new Error("查表長度不符");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    data as Uint8Array<ArrayBuffer>,
  );
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  if (hash !== file.checksum) throw new Error("查表校驗失敗，請重新載入");
  return data;
}
const ready = (async () => {
  const response = await fetch("/tables/distance-manifest.json");
  if (!response.ok) throw new Error("無法載入分析資料，請確認連線後重試");
  const manifest = (await response.json()) as TableManifest;
  if (manifest.version !== TABLE_VERSION || manifest.slots !== SLOTS)
    throw new Error("查表版本不相容，請更新應用程式");
  const [suit, honors] = await Promise.all([
    load(manifest.suit),
    load(manifest.honors),
  ]);
  engine = new DistanceEngine({ suit, honors });
  send({ id: 0, kind: "ready" });
})();
// The main thread only sends one job at a time and retains the newest pending board.
ready.catch(() => {
  /* Request handler reports initialization failure with its request ID. */
});
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    await ready;
    const key = JSON.stringify(request.board);
    if (key !== lastBoard) {
      analyzer = new Analyzer(request.board, engine);
      lastBoard = key;
    }
    if (request.kind === "analyze")
      send({ id: request.id, kind: "analyze", result: analyzer.analyze() });
    else
      send({
        id: request.id,
        kind: "detail",
        detail: analyzer.detail(request.discard),
      });
  } catch (error) {
    send({
      id: request.id,
      kind: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
