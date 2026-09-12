<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRegisterSW } from "virtual:pwa-register/vue";
import {
  cloneBoard,
  emptyBoard,
  ownMelds,
  parseTiles,
  type TileId,
} from "@taiwan-mahjong/core";
import { sampleBoard, useBoard } from "./composables/useBoard";
import { useAnalysis } from "./composables/useAnalysis";
import AnalysisSummary from "./components/AnalysisSummary.vue";
import EffectiveTiles from "./components/EffectiveTiles.vue";
import HandEditor from "./components/HandEditor.vue";
import TileKeyboard from "./components/TileKeyboard.vue";
import DiscardOptions from "./components/DiscardOptions.vue";
import DecompositionDrawer from "./components/DecompositionDrawer.vue";
import PublicBoardEditor from "./components/PublicBoardEditor.vue";
import Drawer from "./components/Drawer.vue";
const state = useBoard();
const { board, notice, recent, validation, undoStack } = state;
const analysis = useAnalysis(board);
const { result, detail, busy, detailBusy, loaded, error } = analysis;
const selected = ref<TileId>();
const drawer = ref<"details" | "public" | "text" | "menu" | "share">();
const publicMode = ref("牌河"),
  inputText = ref(""),
  inputError = ref(""),
  shareUrl = ref("");
const isDevelopment = import.meta.env.DEV;
const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
  onRegisterError() {
    notice.value = "離線快取未完成，請保留連線後重新整理。";
  },
});
const offlineAvailable = computed(
  () =>
    offlineReady.value ||
    (loaded.value && !!navigator.serviceWorker?.controller),
);
const selectedOption = computed(() =>
  result.value?.discardOptions.find((o) => o.tile === selected.value),
);
const efficiency = computed(
  () => selectedOption.value ?? result.value?.current,
);
watch(result, (value) => {
  selected.value = value?.discardOptions[0]?.tile;
});
watch(board, () => {
  if (drawer.value === "details") drawer.value = undefined;
});
function selectCandidate(tile: number) {
  selected.value = tile;
}
function openDetails() {
  drawer.value = "details";
  if (result.value?.mode !== "won") analysis.requestDetail(selected.value);
}
function openPublic(mode: string) {
  publicMode.value = mode;
  drawer.value = "public";
}
function openText() {
  inputText.value = "";
  inputError.value = "";
  drawer.value = "text";
}
function applyText() {
  try {
    const next = cloneBoard(board.value);
    next.concealed = parseTiles(inputText.value);
    delete next.drawnTile;
    state.change(next);
    drawer.value = undefined;
  } catch (e) {
    inputError.value = e instanceof Error ? e.message : String(e);
  }
}
async function share() {
  try {
    shareUrl.value = state.checkpoint();
    drawer.value = "share";
    try {
      await navigator.clipboard.writeText(shareUrl.value);
      notice.value = "已複製完整盤面連結。";
    } catch {
      notice.value = "請複製分享欄位中的連結。";
    }
  } catch (e) {
    notice.value = e instanceof Error ? e.message : String(e);
  }
}
function loadSample() {
  state.change(sampleBoard());
  state.checkpoint();
  drawer.value = undefined;
}
function clearBoard() {
  state.change(emptyBoard());
  state.checkpoint();
  drawer.value = undefined;
}
async function update() {
  if (state.save()) await updateServiceWorker(true);
}
</script>
<template>
  <div class="app-shell">
    <header class="app-header">
      <a class="brand" href="/" @click.prevent="drawer = 'menu'"
        ><span class="brand-symbol" aria-hidden="true"
          ><img src="/tiles/7z.svg" alt="" draggable="false" /></span
        ><span><strong>牌效率</strong><small>TAIWAN / 16 TILES</small></span></a
      >
      <nav aria-label="盤面操作">
        <button
          aria-label="復原上一步"
          :disabled="!undoStack.length"
          @click="state.undo"
        >
          ↶</button
        ><button aria-label="分享盤面" @click="share">↑</button
        ><button aria-label="選單與歷史" @click="drawer = 'menu'">⋯</button>
      </nav>
    </header>
    <main>
      <div class="segmented mode-state" aria-label="目前摸牌狀態">
        <span :class="{ active: validation.structuralCount === 16 }"
          >摸牌前 · 16 張</span
        ><span :class="{ active: validation.structuralCount === 17 }"
          >摸牌後 · 17 張</span
        >
      </div>
      <div v-if="notice" class="notice" role="status">
        <span>{{ notice }}</span
        ><button aria-label="關閉提示" @click="notice = ''">×</button>
      </div>
      <div v-if="needRefresh" class="notice">
        新版本已備妥。<button @click="update">保存盤面並更新</button>
      </div>
      <section
        v-if="validation.status !== 'valid'"
        class="status-card"
        :class="{ invalid: validation.status === 'invalid' }"
        aria-live="polite"
      >
        <span class="eyebrow">{{
          validation.status === "editing" ? "繼續輸入" : "請修正盤面"
        }}</span>
        <h1>
          {{
            validation.status === "editing"
              ? `還缺 ${16 - validation.structuralCount} 張`
              : "盤面資料不合法"
          }}
        </h1>
        <button
          v-for="(issue, i) in validation.issues"
          :key="i"
          class="issue-button"
          @click="
            issue.path === 'concealed' || issue.path === 'drawnTile'
              ? openText()
              : openPublic('牌河')
          "
        >
          {{ issue.message }}
        </button>
      </section>
      <section v-else-if="error" class="status-card invalid" role="alert">
        <h1>暫時無法分析</h1>
        <p>{{ error }}</p>
        <button class="primary-button" @click="analysis.retry">
          重新載入分析資料
        </button>
      </section>
      <section
        v-else-if="busy || !result"
        class="status-card loading"
        role="status"
      >
        <span class="eyebrow">{{ loaded ? "計算中" : "首次載入" }}</span>
        <h1>{{ loaded ? "正在分析這手牌…" : "準備分析資料…" }}</h1>
        <p>你可以繼續點牌，完成後會顯示最新結果。</p>
      </section>
      <template v-else>
        <AnalysisSummary
          :efficiency="efficiency"
          :discard="selected"
          :best="selectedOption?.best"
          :won="result.mode === 'won'"
          @detail="openDetails"
        />
        <EffectiveTiles
          v-if="efficiency"
          :key="selected ?? -1"
          :efficiency="efficiency"
        />
      </template>
      <HandEditor
        :board="board"
        :selected="selected"
        @remove="state.removeTile"
        @text="openText"
        @public="openPublic('牌河')"
      />
      <DiscardOptions
        v-if="result?.mode === 'discard'"
        :options="result.discardOptions"
        :selected="selected"
        @select="selectCandidate"
      />
      <button v-if="result" class="details-link" @click="openDetails">
        <span>最佳拆解與改良牌</span><span>查看詳情 →</span>
      </button>
      <div class="app-footnote">
        <span>{{
          offlineAvailable
            ? "● 可離線使用"
            : isDevelopment
              ? "開發預覽 · 離線功能於正式建置啟用"
              : "離線快取準備中"
        }}</span
        ><span>V0.1</span>
      </div>
    </main>
    <div class="keyboard-dock">
      <TileKeyboard
        :remaining="validation.remaining"
        @tile="state.addTile"
        @erase="
          board.concealed.length && state.removeTile(board.concealed.length - 1)
        "
        @region="
          (region) => {
            if (region !== '手牌') openPublic(region);
          }
        "
      />
    </div>
  </div>
  <DecompositionDrawer
    v-if="drawer === 'details'"
    :detail="detail"
    :winning="result?.winningDecompositions"
    :busy="detailBusy"
    :error="error"
    :melds="ownMelds(board)"
    @close="drawer = undefined"
  />
  <PublicBoardEditor
    v-if="drawer === 'public'"
    :board="board"
    :initial-mode="publicMode"
    @change="state.change"
    @close="drawer = undefined"
  />
  <Drawer
    v-if="drawer === 'text'"
    title="輸入完整暗手"
    @close="drawer = undefined"
    ><form @submit.prevent="applyText">
      <label class="field"
        >中文或 m/p/s/z<textarea
          v-model="inputText"
          rows="4"
          placeholder="123456m789p12345s77z&#10;一二三萬 456筒 789索 東東"
          aria-describedby="text-help"
        />
      </label>
      <p id="text-help">
        套用後取代目前暗手，保留副露與公開牌。字牌順序：東南西北白發中。
      </p>
      <p v-if="inputError" class="error-message" role="alert">
        {{ inputError }}
      </p>
      <button class="primary-button" type="submit">套用手牌</button>
    </form></Drawer
  >
  <Drawer
    v-if="drawer === 'share'"
    title="分享這一手"
    @close="drawer = undefined"
    ><p>連結包含手牌、副露、四家牌河與花牌；開啟後會重新分析。</p>
    <label class="field"
      >完整盤面連結<textarea
        :value="shareUrl"
        readonly
        rows="4"
        @focus="($event.target as HTMLTextAreaElement).select()"
      />
    </label>
    <p>此連結不含分析結果，所有計算都在裝置上完成。</p></Drawer
  >
  <Drawer
    v-if="drawer === 'menu'"
    title="盤面與設定"
    @close="drawer = undefined"
    ><div class="menu-actions">
      <button class="primary-button" @click="loadSample">載入示例牌局</button
      ><button class="secondary-button" @click="clearBoard">建立空白盤面</button
      ><button
        class="secondary-button"
        @click="
          state.checkpoint();
          notice = '已保存目前盤面';
          drawer = undefined;
        "
      >
        保存目前盤面
      </button>
    </div>
    <h3>最近盤面</h3>
    <p v-if="!recent.length">尚無本機歷史</p>
    <button
      v-for="(item, i) in recent"
      :key="item.token"
      class="history-row"
      @click="
        state.restore(item.token);
        drawer = undefined;
      "
    >
      盤面 {{ i + 1
      }}<span>{{ new Date(item.time).toLocaleString("zh-TW") }}</span>
    </button>
    <p class="fine-print">
      第一版僅計算標準台灣十六張「5 面子 ＋ 1
      眼」，不計台數、防守或特殊胡牌。資料存於本機；正式建置完成快取後可離線使用。
    </p></Drawer
  >
</template>
