<script setup lang="ts">
import NoteIngestionDialog from '~/components/Note/NoteIngestionDialog.vue'
import type { MemoryRawItem } from '~/composables/services/useIngestionService'

const props = defineProps<{
  modelValue: boolean
  items: MemoryRawItem[]
  isLoading: boolean
  lastSyncSummary: string | null
  promotingId: number | null
  formatTimestamp: (value: string) => string
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'close'): void
  (event: 'refresh'): void
  (event: 'promote', item: MemoryRawItem): void
}>()
</script>

<template>
  <NoteIngestionDialog
    v-bind="props"
    @update:modelValue="value => emit('update:modelValue', value)"
    @close="emit('close')"
    @refresh="emit('refresh')"
    @promote="item => emit('promote', item)"
  />
</template>
