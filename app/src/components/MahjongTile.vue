<script setup lang="ts">
import { tileCode, tileName } from '@taiwan-mahjong/core';
defineProps<{ tile: number; small?: boolean; chosen?: boolean }>();
</script>
<template>
  <span class="mahjong-tile" :class="{ small, chosen }" role="img" :aria-label="tileName(tile)"><img :src="`/tiles/${tileCode(tile)}.svg`" alt="" draggable="false" /></span>
</template>
