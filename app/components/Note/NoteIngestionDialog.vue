<script setup lang="ts">
import { computed } from '#imports'
import type { MemoryRawItem } from '~/composables/services/useIngestionService'
import NoteIngestionPanel from '~/components/Note/NoteIngestionPanel.vue'

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

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const handleClose = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleRefresh = () => {
  emit('refresh')
}

const handlePromote = (item: MemoryRawItem) => {
  emit('promote', item)
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{ width: 'sm:max-w-3xl' }"
    @close="handleClose"
  >
    <template #content>
      <NoteIngestionPanel
        :items="items"
        :is-loading="isLoading"
        :last-sync-summary="lastSyncSummary"
        :promoting-id="promotingId"
        :format-timestamp="formatTimestamp"
        @refresh="handleRefresh"
        @promote="handlePromote"
        @close="handleClose"
      />
    </template>
  </UModal>
</template>
