<script setup lang="ts">
import { tileName, type ImprovementAnalysis } from '@taiwan-mahjong/core';
import MahjongTile from './MahjongTile.vue';
defineProps<{ improvements: ImprovementAnalysis[] }>();
</script>
<template>
  <section class="improvements"><h3>改良牌</h3><p v-if="!improvements.length">目前無改良牌：沒有同向聽且增加實際受入的換牌。</p><div v-for="item in improvements" :key="item.drawTile" class="improvement-row"><MahjongTile :tile="item.drawTile" small /><div><strong>摸{{ tileName(item.drawTile) }} · 剩 {{ item.remainingBeforeDraw }} 張</strong><p>打{{ item.bestDiscard.map(tileName).join('／') }}</p><span>受入 {{ item.oldUkeire }} → {{ item.newUkeire }} 張</span></div><b>＋{{ item.deltaUkeire }}</b></div></section>
</template>
