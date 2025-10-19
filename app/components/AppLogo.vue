<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'icon'
  alt?: string
}>(), {
  variant: 'default',
  alt: 'MemFilter logo'
})

const src = computed(() => (props.variant === 'icon' ? '/logo_notext.png' : '/logo.png'))
</script>

<template>
  <img :src="src" :alt="props.alt" />
</template>
