<script setup lang="ts">
import { ref } from 'vue';
import { tileName, type Efficiency } from '@taiwan-mahjong/core';
import MahjongTile from './MahjongTile.vue';
defineProps<{ efficiency: Efficiency }>();
const expanded = ref(false);
</script>
<template>
  <section class="effective-section" aria-label="有效牌">
    <h2 class="section-label">有效牌<span>實際未知剩餘張數</span></h2>
    <div class="effective-grid">
      <div v-for="item in (expanded ? efficiency.effectiveTiles : efficiency.effectiveTiles.slice(0, 4))" :key="item.tile" class="effective-row">
        <MahjongTile :tile="item.tile" small /><span>{{ tileName(item.tile) }}</span><div class="count-bar" aria-hidden="true"><i v-for="n in 4" :key="n" :class="{ empty: n > item.remaining }"></i></div><strong>{{ item.remaining }} 張</strong>
      </div>
    </div>
    <p v-if="!efficiency.ukeire" class="subtle">目前沒有實際可摸入的有效牌。</p>
    <button v-if="efficiency.kinds > 4" class="text-button" @click="expanded = !expanded">{{ expanded ? '收合有效牌' : `顯示全部 ${efficiency.kinds} 種有效牌` }}</button>
    <details v-if="efficiency.exhaustedTiles.length" class="exhausted"><summary>理論有效但已無剩餘：{{ efficiency.exhaustedTiles.length }} 種</summary><p>{{ efficiency.exhaustedTiles.map(tileName).join('、') }}</p></details>
  </section>
</template>
