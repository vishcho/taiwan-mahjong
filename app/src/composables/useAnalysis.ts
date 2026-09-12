import { onUnmounted, ref, shallowRef, watch, type Ref } from "vue";
import {
  cloneBoard,
  validateBoard,
  type AnalysisDetail,
  type AnalysisResult,
  type Board,
  type TileId,
} from "@taiwan-mahjong/core";
import type { WorkerReply, WorkerRequest } from "../workers/protocol";
export function useAnalysis(board: Ref<Board>) {
  let worker: Worker;
  let serial = 0;
  let active: WorkerRequest | undefined;
  let pending: WorkerRequest | undefined;
  let debounce: ReturnType<typeof setTimeout>;
  const loaded = ref(false),
    busy = ref(false),
    detailBusy = ref(false),
    error = ref("");
  const result = shallowRef<AnalysisResult>(),
    detail = shallowRef<AnalysisDetail>();
  function sendPending() {
    if (active || !pending) return;
    active = pending;
    pending = undefined;
    worker.postMessage(active);
  }
  function createWorker() {
    worker = new Worker(
      new URL("../workers/analysis.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      const reply = event.data;
      if (reply.kind === "ready") {
        loaded.value = true;
        return;
      }
      active = undefined;
      if (reply.id === serial) {
        busy.value = false;
        detailBusy.value = false;
        if (reply.kind === "error") error.value = reply.error;
        else if (reply.kind === "analyze") result.value = reply.result;
        else detail.value = reply.detail;
      }
      sendPending();
    };
    worker.onerror = (event) => {
      active = undefined;
      busy.value = false;
      detailBusy.value = false;
      error.value = `分析程式無法啟動：${event.message}`;
    };
  }
  createWorker();
  function analyze() {
    serial++;
    result.value = undefined;
    detail.value = undefined;
    error.value = "";
    detailBusy.value = false;
    pending = undefined;
    clearTimeout(debounce);
    const validation = validateBoard(board.value);
    if (validation.status !== "valid") {
      busy.value = false;
      return;
    }
    busy.value = true;
    const request: WorkerRequest = {
      id: serial,
      kind: "analyze",
      board: cloneBoard(board.value),
    };
    debounce = setTimeout(() => {
      pending = request;
      sendPending();
    }, 100);
  }
  function requestDetail(discard?: TileId) {
    serial++;
    detail.value = undefined;
    error.value = "";
    detailBusy.value = true;
    pending = {
      id: serial,
      kind: "detail",
      board: cloneBoard(board.value),
      discard,
    };
    sendPending();
  }
  function retry() {
    worker.terminate();
    active = undefined;
    pending = undefined;
    loaded.value = false;
    createWorker();
    analyze();
  }
  watch(board, analyze, { immediate: true, flush: "sync" });
  onUnmounted(() => {
    clearTimeout(debounce);
    worker.terminate();
  });
  return {
    loaded,
    busy,
    detailBusy,
    error,
    result,
    detail,
    requestDetail,
    retry,
  };
}
