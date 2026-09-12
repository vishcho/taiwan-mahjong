<script setup lang="ts">
import { computed, ref } from 'vue';
import { addMeld, cloneBoard, FLOWERS, PLAYERS, parseTiles, removeDiscard, removeMeld, tileName, updateDiscard, validMeld, type Board, type Meld, type MeldType, type PlayerId } from '@taiwan-mahjong/core';
import Drawer from './Drawer.vue';
import MahjongTile from './MahjongTile.vue';
import TileKeyboard from './TileKeyboard.vue';
const props = defineProps<{ board: Board; initialMode: string }>();
const emit = defineEmits<{ change: [board: Board]; close: [] }>();
const owner = ref<PlayerId>(0), mode = ref(props.initialMode === '手牌' ? '牌河' : props.initialMode);
const meldType = ref<MeldType>('chi'), meldText = ref(''), selectedTiles = ref<number[]>([]);
const sourceId = ref(''), consume = ref(false), tsumogiri = ref(false), error = ref('');
const editingMeld = ref<string>(), editingDiscard = ref<string>();
const names: Record<MeldType, string> = { chi: '吃', pon: '碰', 'open-kan': '明槓', 'closed-kan': '暗槓' };
const available = computed(() => props.board.discards.filter(d => d.player !== owner.value && (!d.calledMeldId || d.calledMeldId === editingMeld.value) && (meldType.value !== 'chi' || d.player === (owner.value + 3) % 4)));
const uuid = () => crypto.randomUUID();
function attempt(operation: () => void) { error.value = ''; try { operation(); } catch (e) { error.value = e instanceof Error ? e.message : String(e); } }
function inputTile(tile: number) {
  if (mode.value === '副露') { selectedTiles.value.push(tile); return; }
  const next = cloneBoard(props.board);
  if (editingDiscard.value) {
    emit('change', updateDiscard(next, editingDiscard.value, { tile, player: owner.value, tsumogiri: tsumogiri.value }));
    editingDiscard.value = undefined;
  } else { next.discards.push({ id: uuid(), tile, player: owner.value, tsumogiri: tsumogiri.value }); emit('change', next); }
}
function addFlower(tile: number) {
  const next = cloneBoard(props.board);
  const existing = next.flowers.findIndex(f => f.tile === tile);
  if (existing >= 0) {
    if (next.flowers[existing].owner === owner.value) next.flowers.splice(existing, 1);
    else { error.value = `${FLOWERS[tile]}已屬於${PLAYERS[next.flowers[existing].owner]}，請先移除原紀錄。`; return; }
  } else next.flowers.push({ tile, owner: owner.value });
  emit('change', next);
}
function commitMeld() {
  attempt(() => {
    const tiles = meldText.value.trim() ? parseTiles(meldText.value) : [...selectedTiles.value];
    const source = props.board.discards.find(d => d.id === sourceId.value);
    const meld: Meld = { id: editingMeld.value ?? uuid(), type: meldType.value, tiles, owner: owner.value };
    if (source && meldType.value !== 'closed-kan') { meld.calledFrom = source.player; meld.calledDiscardId = source.id; }
    if (!validMeld(meld)) throw new Error('請輸入合法的吃（三張連續同花色）、碰（三張相同）或槓（四張相同）。');
    const base = editingMeld.value ? removeMeld(props.board, editingMeld.value) : props.board;
    emit('change', addMeld(base, meld, consume.value && !editingMeld.value));
    selectedTiles.value = []; meldText.value = ''; sourceId.value = ''; editingMeld.value = undefined;
  });
}
function editMeld(m: Meld) { owner.value = m.owner; mode.value = '副露'; editingMeld.value = m.id; selectedTiles.value = [...m.tiles]; meldText.value = ''; meldType.value = m.type; sourceId.value = m.calledDiscardId ?? ''; consume.value = false; }
function erase() {
  if (mode.value === '副露') selectedTiles.value.pop();
  else if (mode.value === '牌河') { const d = props.board.discards.filter(d => d.player === owner.value).at(-1); if (d) emit('change', removeDiscard(props.board, d.id)); }
}
</script>
<template>
  <Drawer title="公開牌與副露" @close="emit('close')">
    <nav class="segmented light" aria-label="玩家"><button v-for="(player, i) in PLAYERS" :key="player" :aria-pressed="owner === i" @click="owner = i as PlayerId">{{ player }}</button></nav>
    <nav class="segmented light" aria-label="公開資訊類型"><button v-for="region in ['副露', '牌河', '花牌']" :key="region" :aria-pressed="mode === region" @click="mode = region">{{ region }}</button></nav>
    <p v-if="error" role="alert" class="error-message">{{ error }}</p>
    <template v-if="mode === '副露'">
      <div class="form-row"><label>類型<select v-model="meldType"><option v-for="(name, type) in names" :key="type" :value="type">{{ name }}</option></select></label><label v-if="meldType !== 'closed-kan'">連結被叫走捨牌<select v-model="sourceId"><option value="">無牌河紀錄</option><option v-for="d in available" :key="d.id" :value="d.id">{{ PLAYERS[d.player] }} · {{ tileName(d.tile) }} · 第 {{ board.discards.filter(x => x.player === d.player).findIndex(x => x.id === d.id) + 1 }} 張</option></select></label></div>
      <label class="field">副露文字<input v-model="meldText" placeholder="例如 123m、東東東 或 5555p" @keydown.enter="commitMeld" /></label>
      <div v-if="selectedTiles.length" class="selected-meld"><button v-for="(tile, i) in selectedTiles" :key="i" :aria-label="`移除副露選牌${tileName(tile)}`" @click="selectedTiles.splice(i, 1)"><MahjongTile :tile="tile" small /></button></div>
      <label v-if="owner === 0 && !editingMeld" class="checkbox"><input v-model="consume" type="checkbox" /> 從目前暗手移出副露用牌</label>
      <button class="primary-button" @click="commitMeld">{{ editingMeld ? '儲存副露修改' : '加入副露' }}</button>
      <div class="public-records"><div v-for="m in board.melds.filter(m => m.owner === owner)" :key="m.id" class="public-record"><span>{{ names[m.type] }}</span><span class="tile-line"><MahjongTile v-for="(tile, i) in m.tiles" :key="i" :tile="tile" small /></span><button @click="editMeld(m)">修改</button><button :aria-label="`刪除${names[m.type]}`" @click="emit('change', removeMeld(board, m.id))">刪除</button></div></div>
    </template>
    <template v-else-if="mode === '牌河'">
      <p>{{ editingDiscard ? '請點選新的牌，完成這筆捨牌修改。' : '點下方鍵盤加入捨牌，依輸入順序保存。' }}</p>
      <label class="checkbox"><input v-model="tsumogiri" type="checkbox" /> 摸切標記</label>
      <div class="public-records"><div v-for="(d, i) in board.discards.filter(d => d.player === owner)" :key="d.id" class="public-record"><span>{{ i + 1 }}</span><MahjongTile :tile="d.tile" small /><span>{{ d.calledMeldId ? '已叫走' : d.tsumogiri ? '摸切' : '手切' }}</span><button @click="editingDiscard = d.id; tsumogiri = !!d.tsumogiri">修改</button><button :aria-label="`刪除牌河第${i + 1}張${tileName(d.tile)}`" @click="emit('change', removeDiscard(board, d.id))">刪除</button></div></div>
    </template>
    <template v-else><p>點花牌記錄歸屬，再點一次移除。不計入結構張數。</p><p>{{ board.flowers.filter(f => f.owner === owner).map(f => FLOWERS[f.tile]).join('、') || '尚未記錄花牌' }}</p></template>
    <TileKeyboard :mode="mode" :regions="false" @tile="inputTile" @flower="addFlower" @erase="erase" />
  </Drawer>
</template>
