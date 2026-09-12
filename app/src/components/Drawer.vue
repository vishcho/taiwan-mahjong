<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from 'vue';
defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLDialogElement>();
const titleId = useId();
let previous: HTMLElement | null = null;
onMounted(() => { previous = document.activeElement as HTMLElement; dialog.value?.showModal(); });
onUnmounted(() => { dialog.value?.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); });
</script>
<template>
  <Teleport to="body">
    <dialog ref="dialog" class="drawer" :aria-labelledby="titleId" @cancel.prevent="emit('close')" @click="event => { if (event.target === dialog) emit('close') }">
      <div class="drawer-inner">
        <header class="drawer-header"><h2 :id="titleId">{{ title }}</h2><button class="close-button" aria-label="關閉抽屜" autofocus @click="emit('close')">×</button></header>
        <slot />
      </div>
    </dialog>
  </Teleport>
</template>
