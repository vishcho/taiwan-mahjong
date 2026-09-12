<script setup lang="ts">
import type { DiscardOption } from '@taiwan-mahjong/core';
import { tileName } from '@taiwan-mahjong/core';
import MahjongTile from './MahjongTile.vue';
defineProps<{ options: DiscardOption[]; selected?: number }>();
defineEmits<{ select: [tile: number] }>();
</script>
<template>
  <div class="discard-options">
    <p v-if="options.filter(o => o.best).length > 1" class="subtle">以下捨牌並列最佳，可逐一比較。</p>
    <div v-if="options.filter(o => o.best).length > 1" class="best-options"><button v-for="o in options.filter(o => o.best)" :key="o.tile" :aria-pressed="selected === o.tile" @click="$emit('select', o.tile)">打{{ tileName(o.tile) }} · {{ o.ukeire }} 張</button></div>
    <details>
<summary>比較其他捨牌（{{ options.length }} 種）</summary><div class="candidate-list">
      <button v-for="option in options" :key="option.tile" :aria-pressed="selected === option.tile" @click="$emit('select', option.tile)"><MahjongTile :tile="option.tile" small /><span>打{{ tileName(option.tile) }}<small>{{ option.best ? '最佳' : '候選' }}</small></span><span>{{ option.shanten }} 向聽</span><strong>{{ option.ukeire }} 張<small>{{ option.kinds }} 種</small></strong></button>
    </div>
</details>
  </div>
</template>
