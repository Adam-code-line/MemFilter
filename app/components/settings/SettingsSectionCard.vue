<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: undefined
  },
  icon: {
    type: String,
    default: undefined
  },
  accent: {
    type: String,
    default: 'neutral'
  }
})

const accentClass = computed(() => {
  switch (props.accent) {
    case 'primary':
      return 'border-primary-200 dark:border-primary-500/40'
    case 'warning':
      return 'border-amber-200 dark:border-amber-500/40'
    case 'success':
      return 'border-emerald-200 dark:border-emerald-500/40'
    default:
      return 'border-gray-200/70 dark:border-white/10'
  }
})
</script>

<template>
  <UCard :class="['h-full', accentClass]">
    <template #header>
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <UIcon v-if="icon" :name="icon" class="text-lg text-primary" />
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
        </div>
        <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400">
          {{ description }}
        </p>
      </div>
    </template>

    <div class="space-y-4">
      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <slot name="footer" />
      </div>
    </template>
  </UCard>
</template>
