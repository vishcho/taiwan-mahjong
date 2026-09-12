<script setup lang="ts">
import { computed, ref } from 'vue';
import { FLOWERS, tileCode, tileName } from '@taiwan-mahjong/core';
const props = withDefaults(defineProps<{ mode?: string; regions?: boolean; remaining?: number[] }>(), { mode: '手牌', regions: true, remaining: undefined });
const emit = defineEmits<{ tile: [tile: number]; flower: [tile: number]; erase: []; region: [region: string] }>();
const suit = ref(0);
const keys = computed(() => Array.from({ length: props.mode === '花牌' ? 8 : suit.value === 3 ? 7 : 9 }, (_, i) => props.mode === '花牌' ? i : suit.value * 9 + i));
</script>
<template>
  <section class="keyboard" aria-label="麻將牌鍵盤">
    <nav v-if="regions" class="input-tabs" aria-label="輸入區域">
      <button v-for="region in ['手牌', '副露', '牌河', '花牌']" :key="region" :aria-pressed="mode === region" @click="emit('region', region)">{{ region }}</button>
    </nav>
    <nav v-if="mode !== '花牌'" class="suit-tabs" aria-label="牌種">
      <button v-for="(name, index) in ['萬', '筒', '索', '字']" :key="name" :aria-pressed="suit === index" @click="suit = index">{{ name }}</button>
    </nav>
    <div class="keys">
      <button v-for="tile in keys" :key="tile" class="tile-key" :aria-label="`輸入${mode === '花牌' ? FLOWERS[tile] : tileName(tile)}`" @click="mode === '花牌' ? emit('flower', tile) : emit('tile', tile)">
        <img :src="`/tiles/${mode === '花牌' ? `${tile + 1}f` : tileCode(tile)}.svg`" alt="" draggable="false" />
        <span v-if="mode !== '花牌' && remaining && remaining[tile] === 0" class="used-up">已知 4</span>
      </button>
      <button class="tile-key erase" aria-label="刪除最後一張" @click="emit('erase')">⌫</button>
    </div>
  </section>
</template>
