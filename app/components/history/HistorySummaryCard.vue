<script setup lang="ts">

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: undefined
  },
  value: {
    type: Number,
    required: true
  },
  icon: {
    type: String,
    default: undefined
  },
  color: {
    type: String,
    default: 'neutral'
  }
})

const colorClass = computed(() => {
  switch (props.color) {
    case 'primary':
      return 'text-primary-600 dark:text-primary-300'
    case 'warning':
      return 'text-amber-600 dark:text-amber-300'
    case 'success':
      return 'text-emerald-600 dark:text-emerald-300'
    case 'error':
      return 'text-rose-600 dark:text-rose-300'
    default:
      return 'text-slate-600 dark:text-slate-300'
  }
})
</script>

<template>
  <UCard class="h-full border border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/60">
    <div class="flex items-start gap-3">
      <div class="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary-50/70 dark:bg-primary-500/10">
        <UIcon v-if="icon" :name="icon" class="text-lg text-primary-500 dark:text-primary-300" />
        <UIcon v-else name="i-lucide-archive" class="text-lg text-primary-500 dark:text-primary-300" />
      </div>
      <div class="space-y-1">
        <p class="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">{{ label }}</p>
        <p class="text-2xl font-semibold" :class="colorClass">{{ value }}</p>
        <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
      </div>
    </div>
  </UCard>
</template>
