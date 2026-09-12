<script setup lang="ts">
import { computed } from 'vue';
import { ownMelds, structuralCount, tileName, type Board } from '@taiwan-mahjong/core';
import MahjongTile from './MahjongTile.vue';
const props = defineProps<{ board: Board; selected?: number }>();
defineEmits<{ remove: [index: number]; text: []; public: [] }>();
const sorted = computed(() => props.board.concealed.map((tile, index) => ({ tile, index })).sort((a, b) => a.tile - b.tile));
const drawnIndex = computed(() => props.board.drawnTile === undefined ? -1 : props.board.concealed.lastIndexOf(props.board.drawnTile));
</script>
<template>
  <section class="hand-section" aria-label="目前手牌">
    <h2 class="section-label">我的手牌<span>{{ structuralCount(board) }} 張 · {{ ownMelds(board).length ? `${ownMelds(board).length} 組副露` : '無副露' }}</span></h2>
    <div class="hand-grid">
      <button v-for="item in sorted" :key="item.index" class="hand-tile" :class="{ drawn: item.index === drawnIndex }" :aria-label="`移除${tileName(item.tile)}${item.index === drawnIndex ? '（剛摸牌）' : ''}`" @click="$emit('remove', item.index)"><MahjongTile :tile="item.tile" :chosen="selected === item.tile" /></button>
    </div>
    <p v-if="!board.concealed.length" class="empty-hand">從下方點牌，開始輸入手牌</p>
    <div v-if="ownMelds(board).length" class="own-melds"><div v-for="meld in ownMelds(board)" :key="meld.id"><MahjongTile v-for="(tile, i) in meld.tiles" :key="i" :tile="tile" small /></div></div>
    <div class="hand-footer"><button @click="$emit('text')">文字輸入</button><span>點手牌移除 · 底線為摸牌</span><button @click="$emit('public')">公開牌 ＋</button></div>
  </section>
</template>
