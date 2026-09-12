<script setup lang="ts">
import { ref } from 'vue';
import type { AnalysisDetail, Decomposition, Meld } from '@taiwan-mahjong/core';
import Drawer from './Drawer.vue';
import MahjongTile from './MahjongTile.vue';
import ImprovementList from './ImprovementList.vue';
defineProps<{ detail?: AnalysisDetail; winning?: Decomposition[]; busy: boolean; error: string; melds: Meld[] }>();
defineEmits<{ close: [] }>();
const expand = ref(false);
const groupLabels = { meld: '面子', pair: '眼', taatsu: '搭子', isolated: '孤張' };
</script>
<template>
  <Drawer title="最佳拆解與改良牌" @close="$emit('close')">
    <p v-if="busy" role="status">正在計算改良牌與最佳拆解…</p><p v-if="error" role="alert">{{ error }}</p>
    <template v-if="detail || winning">
      <p v-if="detail && detail.formulaShanten !== detail.efficiency.shanten" class="notice">已套用四張上限修正：此拆解公式為 {{ detail.formulaShanten }} 向聽，但完成合法胡牌實際為 {{ detail.efficiency.shanten }} 向聽。</p>
      <div v-if="melds.length" class="decomposition"><div v-for="meld in melds" :key="meld.id" class="decomp-group"><div><MahjongTile v-for="(tile, i) in meld.tiles" :key="i" :tile="tile" small /></div><small>固定副露</small></div></div>
      <div v-for="(solution, index) in (expand ? (detail?.bestDecompositions ?? winning) : (detail?.bestDecompositions ?? winning)?.slice(0, 1))" :key="index" class="decomposition"><div v-for="(group, g) in solution.groups" :key="g" class="decomp-group"><div><MahjongTile v-for="(tile, i) in group.tiles" :key="i" :tile="tile" small /></div><small>{{ groupLabels[group.kind] }}</small></div></div>
      <button v-if="(detail?.bestDecompositions.length ?? winning?.length ?? 0) > 1" class="secondary-button" @click="expand = !expand">{{ expand ? '收合其他拆解' : '展開其他最佳拆解' }}</button>
      <p v-if="expand && detail?.decompositionTruncated">顯示前 256 種代表拆解。</p>
      <ImprovementList v-if="detail" :improvements="detail.improvementTiles" />
    </template>
    <p class="fine-print">僅計算標準台灣十六張「5 面子 ＋ 1 眼」；花牌不影響分析。向聽數亦稱尚聽數 / Shanten。</p>
  </Drawer>
</template>
