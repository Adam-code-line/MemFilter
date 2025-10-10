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
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  (event: 'select'): void
}>()

const cardClasses = computed(() => [
  'w-full text-left rounded-xl border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
  props.selected
    ? 'border-primary-500/80 bg-primary-50/70 dark:bg-primary-500/10 dark:border-primary-400/70'
    : 'border-gray-200/70 hover:border-primary-300/80 dark:border-white/10 dark:hover:border-primary-400/60'
])
</script>

<template>
  <button type="button" :class="cardClasses" @click="emit('select')">
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{{ label }}</span>
        <UBadge v-if="selected" label="已选择" color="primary" variant="soft" size="xs" />
      </div>
      <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400">
        {{ description }}
      </p>
    </div>
  </button>
</template>
