<script setup lang="ts">
import type { Efficiency } from '@taiwan-mahjong/core';
import { tileName } from '@taiwan-mahjong/core';
import MahjongTile from './MahjongTile.vue';
defineProps<{ efficiency?: Efficiency; discard?: number; best?: boolean; won?: boolean }>();
defineEmits<{ detail: [] }>();
</script>
<template>
  <section class="result-card" aria-label="分析結果" aria-live="polite">
    <div class="result-heading"><span>{{ won ? '已完成胡牌' : discard !== undefined ? (best ? '● 最佳捨牌' : '候選比較') : '目前向聽數' }}</span><button @click="$emit('detail')">看拆解 ↗</button></div>
    <div class="result-main">
      <MahjongTile v-if="discard !== undefined" :tile="discard" />
      <div class="result-name"><strong>{{ won ? '胡牌' : discard !== undefined ? `打${tileName(discard)}` : efficiency?.shanten === 0 ? '聽牌' : `${efficiency?.shanten ?? '—'} 向聽` }}</strong><p>{{ won ? '5 面子 ＋ 1 眼' : efficiency?.shanten === 0 ? (efficiency.ukeire ? '再摸一張，就有機會胡牌' : '有效牌已無未知剩餘') : '依目前已知盤面計算' }}</p></div>
      <div v-if="efficiency && discard !== undefined" class="shanten-number"><strong>{{ efficiency.shanten }}</strong><span>向聽<br>{{ efficiency.shanten === 0 ? '聽牌' : '捨牌後' }}</span></div>
    </div>
    <div v-if="efficiency" class="metrics"><div><strong data-testid="ukeire">{{ String(efficiency.ukeire).padStart(2, '0') }}</strong><span>實際受入<br>剩餘張數</span></div><div><strong>{{ String(efficiency.kinds).padStart(2, '0') }}</strong><span>有效牌<br>種類</span></div></div>
  </section>
</template>
