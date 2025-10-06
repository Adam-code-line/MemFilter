<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps({
  label: {
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
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const value = computed({
  get: () => props.modelValue,
  set: newValue => emit('update:modelValue', newValue)
})
</script>

<template>
  <div class="flex items-start justify-between gap-4">
    <div class="flex items-start gap-3">
      <UIcon v-if="icon" :name="icon" class="mt-1 text-lg text-primary" />
      <div class="space-y-1">
        <p class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ label }}</p>
        <p v-if="description" class="text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
      </div>
    </div>
    <USwitch v-model="value" color="primary" />
  </div>
</template>
