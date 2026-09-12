import { computed, onUnmounted, ref, watch } from "vue";
import {
  cloneBoard,
  decodeBoard,
  emptyBoard,
  encodeBoard,
  normalizeDrawn,
  parseTiles,
  validateBoard,
  type Board,
  type TileId,
} from "@taiwan-mahjong/core";
export const sampleBoard = (): Board => ({
  ...emptyBoard(),
  concealed: parseTiles("1234569m789p12345s77z"),
  drawnTile: 8,
});
const STORAGE = "mahjong.boards.v1";
export function useBoard() {
  const notice = ref("");
  const recent = ref<{ token: string; time: number }[]>([]);
  const board = ref<Board>(emptyBoard());
  const undoStack = ref<Board[]>([]);
  let stored: Board | undefined;
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE) ?? "[]");
    if (Array.isArray(saved))
      recent.value = saved
        .filter(
          (item): item is { token: string; time: number } =>
            typeof item?.token === "string" && typeof item?.time === "number",
        )
        .slice(0, 10);
    if (recent.value[0]) stored = decodeBoard(recent.value[0].token);
  } catch {
    notice.value = "無法讀取本機歷史，仍可繼續使用。";
  }
  board.value = stored ?? sampleBoard();
  function fromUrl(): boolean {
    const params = new URLSearchParams(location.search);
    if (!params.has("s")) return false;
    try {
      if (params.get("v") !== "1") throw new Error("不支援此分享版本");
      board.value = decodeBoard(params.get("s")!);
      return true;
    } catch (error) {
      notice.value = `分享還原失敗：${error instanceof Error ? error.message : String(error)}。已保留目前盤面。`;
      return false;
    }
  }
  fromUrl();
  function change(next: Board) {
    undoStack.value.push(cloneBoard(board.value));
    if (undoStack.value.length > 60) undoStack.value.shift();
    board.value = normalizeDrawn(cloneBoard(next));
  }
  function addTile(tile: TileId) {
    const next = cloneBoard(board.value);
    next.concealed.push(tile);
    next.drawnTile = tile;
    change(next);
  }
  function removeTile(index: number) {
    const next = cloneBoard(board.value);
    next.concealed.splice(index, 1);
    change(next);
  }
  function undo() {
    const previous = undoStack.value.pop();
    if (previous) board.value = previous;
  }
  function save() {
    try {
      const token = encodeBoard(board.value);
      recent.value = [
        { token, time: Date.now() },
        ...recent.value.filter((r) => r.token !== token),
      ].slice(0, 10);
      localStorage.setItem(STORAGE, JSON.stringify(recent.value));
      return true;
    } catch {
      notice.value =
        "無法寫入本機歷史；目前盤面仍保留在畫面上，請使用分享連結保存。";
      return false;
    }
  }
  function urlFor(token: string): string {
    const url = new URL(location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("v", "1");
    url.searchParams.set("s", token);
    return url.href;
  }
  function checkpoint() {
    const token = encodeBoard(board.value);
    const url = urlFor(token);
    if (location.href !== url) history.pushState({ token }, "", url);
    save();
    return url;
  }
  function restore(token: string) {
    try {
      change(decodeBoard(token));
      checkpoint();
    } catch (error) {
      notice.value = `無法還原：${error instanceof Error ? error.message : String(error)}`;
    }
  }
  const initialToken = encodeBoard(board.value);
  history.replaceState({ token: initialToken }, "", location.href);
  function pop(event: PopStateEvent) {
    if (event.state?.token) {
      try {
        board.value = decodeBoard(event.state.token);
      } catch {
        fromUrl();
      }
    } else fromUrl();
  }
  window.addEventListener("popstate", pop);
  let timer: ReturnType<typeof setTimeout>;
  watch(board, () => {
    clearTimeout(timer);
    timer = setTimeout(save, 1000);
  });
  onUnmounted(() => {
    clearTimeout(timer);
    window.removeEventListener("popstate", pop);
  });
  const validation = computed(() => validateBoard(board.value));
  return {
    board,
    notice,
    recent,
    undoStack,
    validation,
    change,
    addTile,
    removeTile,
    undo,
    save,
    checkpoint,
    restore,
  };
}
